/* =====================================================================
 * multiplayer.js — ពហុអ្នកលេង (Socket.io client)
 * ---------------------------------------------------------------------
 * - ភ្ជាប់ទៅម៉ាស៊ីនមេ server.js (LAN ឬ Online)
 * - ផ្ញើទីតាំង/ចលនារបស់អ្នកលេង ១៥ ដងក្នុងមួយវិនាទី
 * - បង្ហាញអ្នកលេងផ្សេងទៀត (មានស្លាកឈ្មោះ) និងយានជំនិះរបស់ពួកគេ
 * - ការជជែក (Chat) និងការប្រកួតដាវ (PvP)
 * ===================================================================== */
(function () {
  'use strict';
  const AG = (window.AG = window.AG || {});
  const mp = (AG.mp = { connected: false, room: '' });
  const remotes = new Map(); // id → {h, name, look, tag, cur, tgt, veh, vehType}
  let socket = null, sendT = 0, listT = 0;
  const t = (...a) => AG.t(...a);

  // ---------- ភ្ជាប់ទៅម៉ាស៊ីនមេ ----------
  mp.connect = function (url, room, onOk, onFail) {
    if (typeof io === 'undefined') { onFail(t('mpNoLib')); return; }
    const G = AG.game;
    let settled = false;
    const fail = (msg) => { if (settled) return; settled = true; onFail(msg); if (socket) socket.disconnect(); };
    try { socket = io(url, { transports: ['websocket', 'polling'], timeout: 6000, reconnection: false }); }
    catch (e) { fail(e.message); return; }

    socket.on('connect', () => {
      socket.emit('join', { room, name: G.player.name, look: G.player.look }, (res) => {
        if (!res || !res.ok) { fail(res && res.error === 'full' ? t('mpFull') : (res && res.error) || 'error'); return; }
        settled = true; mp.connected = true; mp.room = room;
        (res.players || []).forEach(addRemote);
        onOk();
        AG.ui.chatLine('★', t('mpPlayers', remotes.size + 1));
      });
    });
    socket.on('connect_error', (err) => fail(err && err.message ? err.message : 'connect_error'));

    socket.on('playerJoined', (p) => { addRemote(p); AG.ui.toast(t('mpJoined', p.name)); AG.ui.chatLine('★', t('mpJoined', p.name)); });
    socket.on('playerLeft', (id) => { const r = remotes.get(id); if (r) { AG.ui.toast(t('mpLeft', r.name)); AG.ui.chatLine('★', t('mpLeft', r.name)); removeRemote(id); } });
    socket.on('state', ({ id, s }) => { const r = remotes.get(id); if (r && s) applyState(r, s); });
    socket.on('hit', ({ dmg }) => { if (AG.game.modeName() === 'multiplayer') AG.game.damagePlayer(Math.max(0, Math.min(40, dmg | 0))); });
    socket.on('chat', ({ name, msg }) => AG.ui.chatLine(name, msg));
    socket.on('disconnect', () => {
      if (!mp.connected) return;
      mp.connected = false; clearRemotes();
      AG.ui.toast(t('mpDisconnected'));
    });
  };
  mp.disconnect = function () { mp.connected = false; if (socket) socket.disconnect(); socket = null; clearRemotes(); };
  mp.chat = function (msg) { if (socket && mp.connected) socket.emit('chat', msg.slice(0, 120)); };

  // ---------- អ្នកលេងពីចម្ងាយ ----------
  function nameTag(name) { // ស្លាកឈ្មោះ (Sprite ពី Canvas)
    const c = document.createElement('canvas'); c.width = 256; c.height = 64;
    const g = c.getContext('2d');
    g.fillStyle = 'rgba(74,13,10,.82)'; g.strokeStyle = '#d4a52a'; g.lineWidth = 4;
    g.beginPath(); g.roundRect ? g.roundRect(4, 8, 248, 48, 20) : g.rect(4, 8, 248, 48); g.fill(); g.stroke();
    g.fillStyle = '#fff3dc'; g.font = '600 28px "Kantumruy Pro", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(name, 128, 33, 230);
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest: false, fog: false }));
    s.scale.set(2, 0.5, 1); s.renderOrder = 10;
    return s;
  }
  function buildHuman(r, look) {
    const G = AG.game;
    if (r.h) G.scene.remove(r.h.g);
    const L = look && G.OUTFITS[look.gender] ? look : { gender: 'm', outfit: 0 };
    r.look = L;
    r.h = G.makeHuman(Object.assign({ gender: L.gender }, G.OUTFITS[L.gender][L.outfit] || G.OUTFITS[L.gender][0]));
    r.h.setWeapon(r.weapon || 'sword');
    G.scene.add(r.h.g);
  }
  function addRemote(p) {
    if (remotes.has(p.id)) return;
    const G = AG.game;
    const r = { id: p.id, name: p.name, cur: new THREE.Vector3(0, 0, 24), tgt: new THREE.Vector3(0, 0, 24), rot: 0, tgtRot: 0, atk: 0, mv: 0, weapon: 'sword' };
    buildHuman(r, p.look);
    r.tag = nameTag(p.name); G.scene.add(r.tag);
    remotes.set(p.id, r);
    if (p.s) { applyState(r, p.s); r.cur.copy(r.tgt); }
  }
  function applyState(r, s) {
    if (s.look && (s.look.gender !== r.look.gender || s.look.outfit !== r.look.outfit)) buildHuman(r, s.look);
    if (s.w && s.w !== r.weapon) { r.weapon = s.w === 'knife' ? 'knife' : 'sword'; r.h.setWeapon(r.weapon); }
    r.tgt.set(+s.x || 0, +s.y || 0, +s.z || 0); r.tgtRot = +s.r || 0; r.atk = +s.atk || 0; r.mv = s.mv ? 1 : 0;
    r.vs = s.v || null;
  }
  function removeRemote(id) {
    const r = remotes.get(id); if (!r) return;
    const sc = AG.game.scene;
    sc.remove(r.h.g); sc.remove(r.tag); if (r.veh) sc.remove(r.veh);
    remotes.delete(id);
  }
  function clearRemotes() { for (const id of [...remotes.keys()]) removeRemote(id); }

  // ---------- អាប់ដេតរាល់ frame (ហៅពី game.js) ----------
  mp.update = function (dt) {
    if (!mp.connected || !socket) return;
    const G = AG.game;
    sendT += dt;
    if (sendT > 1 / 15) { sendT = 0; socket.volatile.emit('state', G.getPlayerState()); }
    const k = 1 - Math.exp(-12 * dt);
    for (const r of remotes.values()) {
      // យានជំនិះរបស់អ្នកលេងផ្សេង
      if (r.vs) {
        if (!r.veh || r.vehType !== r.vs.t) {
          if (r.veh) G.scene.remove(r.veh);
          r.veh = G.makeVehicleMesh(r.vs.t, r.vs.c || 0xb3261e); r.vehType = r.vs.t; G.scene.add(r.veh);
        }
        r.cur.x += (r.vs.x - r.cur.x) * k; r.cur.z += (r.vs.z - r.cur.z) * k;
        r.veh.position.set(r.cur.x, r.vs.t === 'boat' ? -0.12 : G.floorAt(r.cur.x, r.cur.z), r.cur.z);
        r.veh.rotation.y += Math.atan2(Math.sin(r.vs.h - r.veh.rotation.y), Math.cos(r.vs.h - r.veh.rotation.y)) * k;
        r.h.g.position.set(r.cur.x, r.veh.position.y + 0.5, r.cur.z); r.h.g.rotation.y = r.veh.rotation.y;
        G.animHuman(r.h, dt, 0, 0, false, true);
      } else {
        if (r.veh) { G.scene.remove(r.veh); r.veh = null; r.vehType = null; }
        r.cur.lerp(r.tgt, k);
        r.rot += Math.atan2(Math.sin(r.tgtRot - r.rot), Math.cos(r.tgtRot - r.rot)) * k;
        r.h.g.position.copy(r.cur); r.h.g.rotation.y = r.rot;
        G.animHuman(r.h, dt, r.mv ? 0.9 : 0, r.atk, false, false);
      }
      r.tag.position.set(r.cur.x, r.h.g.position.y + 2.3, r.cur.z);
    }
    // បញ្ជីអ្នកលេង
    listT += dt;
    if (listT > 1) {
      listT = 0;
      const names = [AG.game.player.name + ' ★', ...[...remotes.values()].map(r => r.name)];
      AG.ui.objective(t('modeMulti') + ' — ' + mp.room, [t('mpPlayers', names.length), ...names.map(n => '• ' + n), t('mpHint1'), t('mpHint2')]);
    }
  };
  mp.mapMarkers = () => [...remotes.values()].map(r => ({ x: r.cur.x, z: r.cur.z, color: '#5ab0ff', kind: 'dot' }));

  // ---------- PvP: ពេលអ្នកលេងវាយ ពិនិត្យថាត្រូវអ្នកលេងផ្សេងឬទេ ----------
  function hookHits() {
    AG.game.onPlayerHit((W, inArc) => {
      if (!mp.connected || AG.game.modeName() !== 'multiplayer') return;
      for (const r of remotes.values()) {
        if (r.vs) continue;
        if (inArc(r.cur.x, r.cur.z, r.cur.y)) {
          const dmg = Math.round(W.dmg * 0.6);
          socket.emit('hit', { to: r.id, dmg });
          AG.game.floatText(r.cur, '-' + dmg, 'dmg');
          AG.audio && AG.audio.play('hit');
        }
      }
    });
  }
  if (AG.game && AG.game.onPlayerHit) hookHits(); else addEventListener('DOMContentLoaded', hookHits);
})();
