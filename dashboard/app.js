// Token Radar's dashboard (radar-2). It reads window.RADAR (written beside dashboard/ by main.ts)
// and renders the ranked board, filters, a per-protocol detail view with the model's own breakdown
// and the protocol's farm plan, the live-token table, and a what-if sandbox. No network: every byte
// it shows is in data.js.
(function () {
  'use strict';

  var D = window.RADAR;
  if (!D) return;

  var $ = function (id) { return document.getElementById(id); };
  var state = { q: '', cat: 'all', chain: 'all', wl: false, tab: 'pre', sort: 'implied', dir: -1, sel: null, sb: false, gw: 0.6, cap: 1.5, mf: 0.6 };

  function esc(s) {
    return String(s === null || s === undefined ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function fmtUsd(n) {
    if (n === null || n === undefined || !isFinite(n)) return 'n/a';
    if (Math.abs(n) >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
    if (Math.abs(n) >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
    if (Math.abs(n) >= 1e3) return '$' + Math.round(n / 1e3) + 'K';
    return '$' + Math.round(n);
  }
  function fmtPct(n) {
    if (n === null || n === undefined || !isFinite(n)) return 'n/a';
    return (n > 0 ? '+' : '') + n.toFixed(2) + '%';
  }
  function fmtAge(days) {
    if (days === null || days === undefined) return 'unknown';
    if (days >= 365) return (days / 365).toFixed(1) + 'y';
    return Math.max(0, Math.round(days)) + 'd';
  }
  function chip(n) {
    if (n === null || n === undefined || !isFinite(n)) return '<span class="chip flat">n/a</span>';
    return '<span class="chip ' + (n >= 0 ? 'up' : 'down') + '">' + esc(fmtPct(n)) + '</span>';
  }
  function chainsOf(r) {
    return r.chains && r.chains.length ? r.chains.slice(0, 2).join(', ') : 'an unnamed chain';
  }

  // The what-if value of a row under the sandbox sliders, from the row's own stored figures.
  function whatIf(r) {
    var m = D.model;
    var growth = Math.min(m.growth_cap, Math.max(m.growth_floor, r.change_7d === null || r.change_7d === undefined ? 0 : r.change_7d));
    var g = 1 + (growth / 100) * state.gw;
    var age = r.age_days === null || r.age_days === undefined ? m.unknown_age_days : r.age_days;
    var mat = state.mf + (Math.min(Math.max(age, 0), m.maturity_days) / m.maturity_days) * (1 - state.mf);
    var base = r.tvl_usd * Math.min(r.peer_multiple, state.cap);
    return Math.max(1, Math.round(base * g * mat));
  }
  // Live rows carry a market cap, not an implied value: sort them by the market's own number.
  function shownValue(r) {
    if (r.implied_value_usd === undefined || r.implied_value_usd === null) return r.mcap_usd === null || r.mcap_usd === undefined ? 0 : r.mcap_usd;
    return state.sb ? whatIf(r) : r.implied_value_usd;
  }

  function sortVal(r, key) {
    if (key === 'name') return r.name.toLowerCase();
    if (key === 'tvl') return r.tvl_usd;
    if (key === 'growth') return r.change_7d === null ? -Infinity : r.change_7d;
    if (key === 'age') return r.age_days === null ? Infinity : r.age_days;
    if (key === 'mcap') return r.mcap_usd === null ? -Infinity : r.mcap_usd;
    if (key === 'implied') return shownValue(r);
    return r.rank;
  }
  function sortList(list) {
    var key = state.sort;
    return list.slice().sort(function (a, b) {
      var av = sortVal(a, key), bv = sortVal(b, key);
      if (av < bv) return -state.dir;
      if (av > bv) return state.dir;
      return a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0;
    });
  }

  function filtered() {
    var q = state.q.trim().toLowerCase();
    var list = state.tab === 'pre' ? D.rows : D.live;
    return list.filter(function (r) {
      if (state.cat !== 'all' && r.category !== state.cat) return false;
      if (state.chain !== 'all' && (!r.chains || r.chains.indexOf(state.chain) < 0)) return false;
      if (state.tab === 'pre' && state.wl && !r.watchlist) return false;
      if (!q) return true;
      var hay = [r.name, r.slug, r.category, (r.chains || []).join(' ')].join(' ').toLowerCase();
      return hay.indexOf(q) >= 0;
    });
  }

  function headCell(key, label) {
    var arrow = state.sort === key ? (state.dir < 0 ? ' ↓' : ' ↑') : '';
    return '<th><button type="button" data-sort="' + key + '">' + esc(label) + esc(arrow) + '</button></th>';
  }

  function renderHead() {
    var h = state.tab === 'pre'
      ? '<tr>' + headCell('rank', 'Rank') + headCell('name', 'Protocol') + headCell('tvl', 'TVL') + headCell('growth', '7d') + headCell('age', 'Age') + headCell('implied', state.sb ? 'Implied value (what-if)' : 'Implied value') + '<th>Token</th></tr>'
      : '<tr><th>Status</th>' + headCell('name', 'Protocol') + headCell('tvl', 'TVL') + headCell('growth', '7d') + headCell('mcap', 'Market cap') + '<th>Token</th></tr>';
    $('head').innerHTML = h;
  }

  function renderRows() {
    var list = sortList(filtered());
    var max = 1;
    list.forEach(function (r) { max = Math.max(max, shownValue(r)); });
    var html = '';
    if (list.length === 0) {
      $('rows').innerHTML = '';
      $('count').textContent = 'No protocol matches that filter.';
      return;
    }
    list.forEach(function (r) {
      if (state.tab === 'pre') {
        var v = shownValue(r);
        html += '<tr data-slug="' + esc(r.slug) + '" data-sel="' + (state.sel === r.slug) + '" tabindex="0">'
          + '<td class="num"><span class="rank">' + r.rank + '</span></td>'
          + '<td><div class="name"><b>' + esc(r.name) + (r.watchlist ? '<span class="badge">watchlist</span>' : '') + '</b>'
          + '<span class="sub">' + esc(r.category || 'Other') + ' on ' + esc(chainsOf(r)) + '</span></div></td>'
          + '<td class="num">' + esc(fmtUsd(r.tvl_usd)) + '</td>'
          + '<td class="num">' + chip(r.change_7d) + '</td>'
          + '<td class="num">' + esc(fmtAge(r.age_days)) + '</td>'
          + '<td><div class="bar" aria-hidden="true"><i style="width:' + Math.max(3, Math.round((v / max) * 100)) + '%"></i></div>'
          + '<span class="num">' + esc(fmtUsd(v)) + '</span></td>'
          + '<td><span class="sub">no token</span></td></tr>';
      } else {
        html += '<tr data-slug="' + esc(r.slug) + '" tabindex="0">'
          + '<td class="num"><span class="sub">live</span></td>'
          + '<td><div class="name"><b>' + esc(r.name) + '</b>'
          + '<span class="sub">' + esc(r.category || 'Other') + ' on ' + esc(chainsOf(r)) + '</span></div></td>'
          + '<td class="num">' + esc(fmtUsd(r.tvl_usd)) + '</td>'
          + '<td class="num">' + chip(r.change_7d) + '</td>'
          + '<td class="num">' + esc(fmtUsd(r.mcap_usd)) + '</td>'
          + '<td><span class="sub">already trades</span></td></tr>';
      }
    });
    $('rows').innerHTML = html;
    $('count').textContent = state.tab === 'pre'
      ? list.length + ' of ' + D.board_size + ' pre-token rows shown' + (state.sb ? ' — what-if values from the sandbox' : '')
      : list.length + ' live-token protocols, by market cap';
  }

  function renderDetail() {
    var box = $('detail');
    var row = null;
    if (state.sel) {
      for (var i = 0; i < D.rows.length; i++) if (D.rows[i].slug === state.sel) { row = D.rows[i]; break; }
    }
    if (!row) { box.innerHTML = ''; return; }
    var m = D.model;
    var peerNote = row.peer_source === 'category'
      ? 'median of ' + row.peer_count + ' live-token peers in ' + (row.category || 'this category')
      : 'global median — fewer than ' + m.min_category_peers + ' live-token peers in ' + (row.category || 'this category');
    var steps = (row.farm_steps || []).map(function (s) {
      var at = s.indexOf(' Cost: ');
      var action = at >= 0 ? s.slice(0, at) : s;
      var tail = at >= 0 ? s.slice(at + 1) : '';
      return '<li><b>' + esc(action) + '</b><span class="cost">' + esc(tail) + '</span></li>';
    }).join('');
    box.innerHTML = '<button class="close" type="button" id="detail-close">Close</button>'
      + '<span class="sub">Rank ' + row.rank + ' of ' + D.board_size + ' · ' + esc(row.category || 'Other') + ' on ' + esc((row.chains || []).join(', ') || 'an unnamed chain') + '</span>'
      + '<h2>' + esc(row.name) + (row.watchlist ? '<span class="badge">watchlist</span>' : '') + '</h2>'
      + '<h3>Model breakdown — radar-2</h3>'
      + '<div class="equation">'
      + '<div><span>TVL</span><b>' + esc(fmtUsd(row.tvl_usd)) + '</b></div>'
      + '<div><span>Peer multiple (' + esc(peerNote) + ')</span><b>' + row.peer_multiple.toFixed(2) + '×</b></div>'
      + '<div><span>Base = TVL × peer multiple</span><b>' + esc(fmtUsd(row.base_value_usd)) + '</b></div>'
      + '<div><span>7d growth</span><b>' + esc(fmtPct(row.change_7d)) + '</b></div>'
      + '<div><span>Growth multiplier</span><b>' + row.growth_multiplier.toFixed(2) + '×</b></div>'
      + '<div><span>Maturity multiplier (' + esc(fmtAge(row.age_days)) + ' with no token)</span><b>' + row.maturity_multiplier.toFixed(2) + '×</b></div>'
      + '<div><span>Implied value = base × growth × maturity</span><b>' + esc(fmtUsd(row.implied_value_usd)) + '</b></div>'
      + '</div>'
      + '<p class="sub">The same function scores every protocol. This is an estimate, not a price.</p>'
      + '<h3>Farm plan — 7 steps</h3><ol class="steps">' + steps + '</ol>';
    $('detail-close').addEventListener('click', function () { state.sel = null; render(); });
  }

  function render() {
    renderHead();
    renderRows();
    renderDetail();
    $('tab-pre').setAttribute('aria-pressed', state.tab === 'pre' ? 'true' : 'false');
    $('tab-live').setAttribute('aria-pressed', state.tab === 'live' ? 'true' : 'false');
  }

  function fillSelects() {
    var cats = {}, chains = {};
    D.rows.forEach(function (r) {
      cats[r.category || 'Other'] = true;
      (r.chains || []).forEach(function (c) { chains[c] = true; });
    });
    var catOpts = '<option value="all">All categories</option>' + Object.keys(cats).sort().map(function (c) {
      return '<option value="' + esc(c) + '">' + esc(c) + '</option>';
    }).join('');
    var chainOpts = '<option value="all">All chains</option>' + Object.keys(chains).sort().map(function (c) {
      return '<option value="' + esc(c) + '">' + esc(c) + '</option>';
    }).join('');
    $('cat').innerHTML = catOpts;
    $('chain').innerHTML = chainOpts;
  }

  function init() {
    $('summary').textContent = 'The watchlist is the floor: every protocol with at least $'
      + Math.round(D.floor_usd / 1e6) + 'M of TVL and no token on record. The early radar adds '
      + D.early_size + ' pre-token protocols below that floor. Implied value is a model, not a promise.';
    $('stats').innerHTML = '<div class="stat"><span>Watchlist covered</span><b>' + D.watchlist_size + ' / ' + D.watchlist_size + '</b></div>'
      + '<div class="stat"><span>Pre-token rows scored</span><b>' + D.board_size + '</b></div>'
      + '<div class="stat"><span>Early rows below the floor</span><b>' + D.early_size + '</b></div>'
      + '<div class="stat"><span>Live-token protocols set aside</span><b>' + D.live_size + '</b></div>';
    $('source').textContent = 'Snapshot ' + D.as_of + ' · ' + D.source + ' · Model ' + D.model_version + '.';
    fillSelects();

    $('q').addEventListener('input', function () { state.q = $('q').value; render(); });
    $('cat').addEventListener('change', function () { state.cat = $('cat').value; render(); });
    $('chain').addEventListener('change', function () { state.chain = $('chain').value; render(); });
    $('wl').addEventListener('change', function () { state.wl = $('wl').checked; render(); });
    $('tab-pre').addEventListener('click', function () { state.tab = 'pre'; state.sel = null; state.sort = 'implied'; state.dir = -1; render(); });
    $('tab-live').addEventListener('click', function () { state.tab = 'live'; state.sel = null; state.sort = 'mcap'; state.dir = -1; render(); });

    $('head').addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('[data-sort]') : null;
      if (!b) return;
      var key = b.getAttribute('data-sort');
      if (state.sort === key) state.dir = -state.dir;
      else { state.sort = key; state.dir = key === 'name' ? 1 : -1; }
      render();
    });
    $('rows').addEventListener('click', function (e) {
      var tr = e.target.closest ? e.target.closest('tr[data-slug]') : null;
      if (!tr || state.tab !== 'pre') return;
      state.sel = tr.getAttribute('data-slug');
      render();
      $('detail').scrollIntoView({ block: 'nearest' });
    });
    $('rows').addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      var tr = e.target.closest ? e.target.closest('tr[data-slug]') : null;
      if (!tr || state.tab !== 'pre') return;
      e.preventDefault();
      state.sel = tr.getAttribute('data-slug');
      render();
    });

    var sliders = [['sb-gw', 'sb-gw-v', 'gw'], ['sb-cap', 'sb-cap-v', 'cap'], ['sb-mf', 'sb-mf-v', 'mf']];
    sliders.forEach(function (cfg) {
      $(cfg[0]).addEventListener('input', function () {
        var v = parseFloat($(cfg[0]).value);
        state[cfg[2]] = v;
        $(cfg[1]).textContent = v.toFixed(2);
        if (state.sb) render();
      });
    });
    $('apply-sb').addEventListener('change', function () { state.sb = $('apply-sb').checked; render(); });

    render();
  }

  init();
})();
