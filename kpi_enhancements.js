// ════════════════════════════════════════════════════════════════════
// KPI Dashboard — Améliorations v2
// Injection automatique : semaine, objectif cobot, comparaison S-4,
//   ETP intérimaires, calendrier de paie
// Ce fichier est chargé par dashboard_fixed__14.html (ajouté par
// update_dashboard_v2_FINAL.py via la balise <script src="kpi_enhancements.js">)
// ════════════════════════════════════════════════════════════════════

(function() {
'use strict';

// ── CSS ──────────────────────────────────────────────────────────────
var CSS = `
.semaine-filter-group{flex:1.2;min-width:160px}
.cobot-objectif-bar{display:flex;align-items:center;justify-content:space-between;
  padding:6px 10px;background:#f0f6ff;border-radius:6px;margin-top:6px;font-size:13px}
.cobot-ecart-badge{padding:3px 10px;border-radius:12px;font-weight:700;font-size:13px}
.cobot-ecart-ok{background:#d4edda;color:#155724}
.cobot-ecart-nok{background:#f8d7da;color:#721c24}
.etp-detail{font-size:12px;color:#555;margin-top:4px;display:flex;gap:8px;
  flex-wrap:wrap;justify-content:center}
.etp-detail span{background:#f0f6ff;padding:2px 8px;border-radius:10px;font-weight:600}
.semaines-comp-section{background:#fff;border:2px solid #0066cc;border-radius:8px;
  padding:14px;margin-bottom:16px;box-shadow:0 2px 6px rgba(0,102,204,.08)}
.semaines-comp-title{font-size:17px;font-weight:700;color:#0066cc;margin-bottom:12px;
  display:flex;align-items:center;gap:8px}
.semaines-comp-table{width:100%;border-collapse:collapse;font-size:14px}
.semaines-comp-table th{background:linear-gradient(135deg,#06c 0,#004999 100%);color:#fff;
  padding:8px 12px;font-weight:700;text-align:center;font-size:13px}
.semaines-comp-table td{padding:8px 12px;border-bottom:1px solid #e0e0e0;text-align:center}
.semaines-comp-table tbody tr:first-child td{background:#f0f6ff;font-weight:700;color:#003388}
.semaines-comp-table tbody tr:hover td{background:#f8f9fa}
.ecart-cell.pos{color:#155724;font-weight:700}
.ecart-cell.neg{color:#721c24;font-weight:700}
.ecart-cell.neu{color:#6c757d}
.paie-section{background:#fff;border:2px solid #e0e0e0;border-radius:8px;
  padding:14px;margin-bottom:16px;box-shadow:0 2px 6px rgba(0,0,0,.05)}
.paie-title{font-size:17px;font-weight:700;color:#0066cc;margin-bottom:12px;
  display:flex;align-items:center;justify-content:space-between}
.paie-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px}
.paie-card{border-radius:8px;padding:12px 14px;border-left:4px solid #ccc;
  background:#f8f9fa;transition:box-shadow .2s}
.paie-card.paie-urgent{border-left-color:#dc3545;background:#fff5f5;
  box-shadow:0 0 0 2px rgba(220,53,69,.2)}
.paie-card.paie-proche{border-left-color:#fd7e14;background:#fff9f0}
.paie-card.paie-ok{border-left-color:#28a745;background:#f0fff4}
.paie-card.paie-passee{border-left-color:#adb5bd;background:#f8f9fa;opacity:.7}
.paie-card-header{font-weight:700;font-size:14px;color:#333;margin-bottom:4px}
.paie-card-periode{font-size:12px;color:#666;margin-bottom:6px}
.paie-card-date{font-size:16px;font-weight:800;color:#0066cc}
.paie-card-alerte{font-size:12px;font-weight:700;margin-top:6px;padding:3px 8px;
  border-radius:10px;display:inline-block}
.alerte-urgent{background:#f8d7da;color:#721c24}
.alerte-proche{background:#fff3cd;color:#856404}
.alerte-ok{background:#d4edda;color:#155724}
.paie-notif-banner{display:none;background:linear-gradient(135deg,#dc3545,#c0392b);
  color:#fff;padding:10px 16px;border-radius:6px;margin-bottom:12px;
  font-weight:700;font-size:14px;box-shadow:0 2px 8px rgba(220,53,69,.3)}
.paie-notif-banner.show{display:flex;align-items:center;gap:10px}
`;

function injectCSS() {
  var style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);
}

// ── Injecter le filtre semaine dans la barre de filtres ──────────────
function injectSemaineFilter() {
  var anneeFilter = document.getElementById('yearFilter');
  if (!anneeFilter) return;
  var anneeGroup = anneeFilter.closest('.filter-group') || anneeFilter.parentElement;
  if (!anneeGroup) return;

  var div = document.createElement('div');
  div.className = 'filter-group semaine-filter-group';
  div.innerHTML =
    '<label>\u{1F4C5} Semaine</label>' +
    '<select id="semaineFilter" style="width:100%;padding:10px;border:2px solid #06c;' +
    'border-radius:6px;font-size:15px;background:#fff">' +
    '<option value="">Toutes les semaines</option>' +
    '</select>';
  anneeGroup.parentElement.insertBefore(div, anneeGroup);

  document.getElementById('semaineFilter').addEventListener('change', function() {
    if (typeof updateDashboard === 'function') updateDashboard();
    updateSemainesComparison();
  });
}

// ── Ajouter badge objectif cobot sous le canvas ──────────────────────
function injectCobotObjectifBar() {
  var box = document.getElementById('boxCobot');
  if (!box || document.getElementById('cobotMoyVal')) return;
  var bar = document.createElement('div');
  bar.className = 'cobot-objectif-bar';
  bar.innerHTML =
    '<span>🎯 Objectif : <strong>90 %</strong></span>' +
    '<span>Taux moyen : <strong id="cobotMoyVal">—</strong></span>' +
    '<span id="cobotEcartBadge" class="cobot-ecart-badge">—</span>';
  box.appendChild(bar);
}

// ── Ajouter détail ETP sous la valeur ────────────────────────────────
function injectETPDetail() {
  var etpN1 = document.getElementById('rhETPN1');
  if (!etpN1 || document.getElementById('etpDetail')) return;
  var div = document.createElement('div');
  div.className = 'etp-detail';
  div.id = 'etpDetail';
  div.innerHTML =
    '<span id="etpPermanents">Perm. : —</span>' +
    '<span id="etpInterimaires">Intérim. : —</span>';
  etpN1.parentElement.insertBefore(div, etpN1.nextSibling);
}

// ── Injecter section comparaison semaines + calendrier paie ──────────
function injectNewSections() {
  if (document.getElementById('semainesCompSection')) return;

  var versionRH = document.getElementById('versionRH');
  var insertTarget = versionRH || document.querySelector('.container');
  if (!insertTarget) return;

  var compDiv = document.createElement('div');
  compDiv.innerHTML = `
<div class="semaines-comp-section no-print" id="semainesCompSection" style="display:none">
  <div class="semaines-comp-title">📆 Comparaison semaines — <span id="semaineCompLabel">S courante</span></div>
  <div style="overflow-x:auto">
  <table class="semaines-comp-table" id="semainesCompTable">
    <thead><tr>
      <th>Semaine</th><th>Production</th><th>Vit. (K ex/h)</th>
      <th>Taux Cobot</th><th>HLD</th><th>Coût/1000</th><th>Évol. Prod %</th>
    </tr></thead>
    <tbody id="semainesCompBody"></tbody>
  </table></div>
</div>
<div class="paie-section no-print" id="paieSection">
  <div class="paie-title">
    <span>💰 Calendrier des paies</span>
    <button onclick="togglePaieSection()" style="padding:4px 10px;font-size:12px;background:#06c;color:#fff;border:none;border-radius:4px;cursor:pointer" id="paieSectionToggleBtn">Réduire ▲</button>
  </div>
  <div id="paieSectionContent">
    <div class="paie-notif-banner" id="paieNotifBanner">⚠️ <span id="paieNotifText"></span></div>
    <div class="paie-grid" id="paieGrid"></div>
    <div style="margin-top:10px;font-size:12px;color:#888">
      <strong>Règle :</strong> La paie couvre du 15 du mois M au 14 du mois M+1, versée le 28 du mois M+1.
    </div>
  </div>
</div>`;

  versionRH
    ? versionRH.parentElement.insertBefore(compDiv, versionRH)
    : insertTarget.appendChild(compDiv);
}

// ── Populer le sélecteur de semaines ────────────────────────────────
function populateSemaineFilter() {
  var sel = document.getElementById('semaineFilter');
  if (!sel || typeof DATA_PRODUCTION === 'undefined') return;
  var annee = parseInt(document.getElementById('yearFilter').value);
  var secteurs = (typeof getAllSelectedSecteurs === 'function') ? getAllSelectedSecteurs() : [];
  var semaines = [];
  DATA_PRODUCTION.forEach(function(d) {
    if (d.Annee === annee && (!secteurs.length || secteurs.includes(d.Secteur))) {
      if (d.Semaine && !semaines.includes(d.Semaine)) semaines.push(d.Semaine);
    }
  });
  semaines.sort(function(a, b) {
    return parseInt(a.replace('S','')) - parseInt(b.replace('S',''));
  });
  var current = sel.value;
  sel.innerHTML = '<option value="">Toutes les semaines</option>';
  semaines.forEach(function(s) {
    var opt = document.createElement('option');
    opt.value = s; opt.textContent = s;
    if (s === current) opt.selected = true;
    sel.appendChild(opt);
  });
}

function getSelectedSemaine() {
  var sel = document.getElementById('semaineFilter');
  return sel && sel.value ? sel.value : null;
}

// ── Mise à jour objectif cobot ────────────────────────────────────────
function updateCobotObjectif(data) {
  var cobotRows = data.filter(function(d) { return !isNaN(d.Taux_COBOT) && d.Taux_COBOT > 0; });
  if (!cobotRows.length) return;
  var moy = cobotRows.reduce(function(s,d) { return s + d.Taux_COBOT; }, 0) / cobotRows.length;
  var moyEl = document.getElementById('cobotMoyVal');
  var ecartEl = document.getElementById('cobotEcartBadge');
  if (moyEl) moyEl.textContent = moy.toFixed(1) + ' %';
  if (ecartEl) {
    var diff = moy - 90;
    ecartEl.textContent = (diff >= 0 ? '✅ +' : '⚠️ ') + diff.toFixed(1) + ' pts vs obj.';
    ecartEl.className = 'cobot-ecart-badge ' + (diff >= 0 ? 'cobot-ecart-ok' : 'cobot-ecart-nok');
  }
}

// ── Ligne objectif 90% sur le graphique ─────────────────────────────
function addCobotObjectifLine() {
  if (typeof Chart === 'undefined') return;
  var canvas = document.getElementById('chartCobot');
  if (!canvas) return;
  var chartInstance = Chart.getChart(canvas);
  if (!chartInstance) return;
  if (chartInstance.data.datasets.find(function(ds) { return ds._isObjectif; })) return;
  var labels = chartInstance.data.labels || [];
  chartInstance.data.datasets.push({
    label: 'Objectif 90%',
    data: labels.map(function() { return 90; }),
    type: 'line',
    borderColor: '#dc3545',
    borderWidth: 2,
    borderDash: [6, 4],
    pointRadius: 0,
    fill: false,
    _isObjectif: true
  });
  chartInstance.update('none');
}

// ── ETP avec détail permanent + intérimaires ─────────────────────────
function updateETPDetail(secteurs, mois, annee) {
  if (typeof DATA_RH === 'undefined') return;
  var data = DATA_RH.filter(function(d) {
    return secteurs.includes(d.Secteur) && d.Mois === mois && d.Annee === annee;
  });
  var etpPerm = 0, etpInt = 0;
  data.forEach(function(d) { etpPerm += (d.NB_ETP||0); etpInt += (d.NB_Interimaires||0); });
  var pEl = document.getElementById('etpPermanents');
  var iEl = document.getElementById('etpInterimaires');
  if (pEl) pEl.textContent = 'Perm. : ' + (etpPerm > 0 ? Math.round(etpPerm) : '—');
  if (iEl) iEl.textContent = 'Intérim. : ' + (etpInt > 0 ? Math.round(etpInt) : '—');
  var etpEl = document.getElementById('rhETP');
  if (etpEl && etpPerm > 0) etpEl.textContent = Math.round(etpPerm + etpInt);
}

// ── Tableau comparaison semaines ────────────────────────────────────
function updateSemainesComparison() {
  var semaineFilter = getSelectedSemaine();
  var section = document.getElementById('semainesCompSection');
  var body = document.getElementById('semainesCompBody');
  var label = document.getElementById('semaineCompLabel');
  if (!section || !body) return;
  if (!semaineFilter) { section.style.display = 'none'; return; }
  section.style.display = 'block';
  if (label) label.textContent = semaineFilter;

  if (typeof DATA_PRODUCTION === 'undefined') return;
  var annee = parseInt(document.getElementById('yearFilter').value);
  var secteurs = (typeof getAllSelectedSecteurs === 'function') ? getAllSelectedSecteurs() : [];
  var semNum = parseInt(semaineFilter.replace('S',''));

  var semaines = [];
  for (var i = 0; i < 5; i++) {
    var n = semNum - i, yr = annee;
    if (n <= 0) { n += 52; yr--; }
    semaines.push({ label: 'S' + String(n).padStart(2,'0'), annee: yr, delta: i });
  }

  body.innerHTML = '';
  var prevProd = null;
  semaines.forEach(function(s, idx) {
    var rows = DATA_PRODUCTION.filter(function(d) {
      return d.Semaine === s.label && d.Annee === s.annee &&
             (!secteurs.length || secteurs.includes(d.Secteur));
    });
    var prod = rows.reduce(function(a,d){return a+(isNaN(d.Prod_Globale)?0:d.Prod_Globale);},0)||null;
    var vitArr = rows.filter(function(d){return d.Vit_prod>0;});
    var vit = vitArr.length ? vitArr.reduce(function(a,d){return a+d.Vit_prod;},0)/vitArr.length : null;
    var cobArr = rows.filter(function(d){return !isNaN(d.Taux_COBOT)&&d.Taux_COBOT>0;});
    var cob = cobArr.length ? cobArr.reduce(function(a,d){return a+d.Taux_COBOT;},0)/cobArr.length : null;
    var hld = rows.reduce(function(a,d){return a+(isNaN(d.HLD)?0:d.HLD);},0)||null;
    var coutArr = rows.filter(function(d){return d.Cout_pour_1000>0;});
    var cout = coutArr.length ? coutArr.reduce(function(a,d){return a+d.Cout_pour_1000;},0)/coutArr.length : null;

    var evolProd = '', evolClass = 'ecart-cell neu';
    if (idx > 0 && prevProd !== null && prod !== null) {
      var pct = (prod - prevProd) / prevProd * 100;
      evolProd = (pct >= 0 ? '▲ +' : '▼ ') + pct.toFixed(1) + ' %';
      evolClass = 'ecart-cell ' + (pct >= 0 ? 'pos' : 'neg');
    }

    var tr = document.createElement('tr');
    var sLabel = (idx===0?'📍 ':('S-'+idx+' · '))+s.label+' ('+s.annee+')';
    tr.innerHTML =
      '<td style="font-weight:700;text-align:left">' + sLabel + '</td>' +
      '<td>' + (prod?Math.round(prod).toLocaleString('fr-FR'):'—') + '</td>' +
      '<td>' + (vit?(vit*1000).toFixed(0):'—') + '</td>' +
      '<td>' + (cob?cob.toFixed(1)+' %':'—') + '</td>' +
      '<td>' + (hld?hld.toFixed(1):'—') + '</td>' +
      '<td>' + (cout?cout.toFixed(2)+' €':'—') + '</td>' +
      '<td class="' + evolClass + '">' + (evolProd||'—') + '</td>';
    body.appendChild(tr);
    prevProd = prod;
  });
}

// ── Calendrier de paie ──────────────────────────────────────────────
var MOIS_NOMS = ['Janvier','Février','Mars','Avril','Mai','Juin',
                 'Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

function buildPaieCalendrier() {
  var paies = [];
  var today = new Date(); today.setHours(0,0,0,0);
  var yr = today.getFullYear();
  var startM = today.getMonth() - 2;
  var startY = yr;
  if (startM < 0) { startM += 12; startY--; }
  for (var k = 0; k < 14; k++) {
    var m = (startM + k) % 12;
    var y = startY + Math.floor((startM + k) / 12);
    var dateVers = new Date(y, m, 28);
    var mDebut = m - 1, yDebut = y;
    if (mDebut < 0) { mDebut = 11; yDebut--; }
    paies.push({
      versement: dateVers,
      label: 'Paie ' + MOIS_NOMS[m] + ' ' + y,
      periode: '15 ' + MOIS_NOMS[mDebut] + ' ' + yDebut + ' → 14 ' + MOIS_NOMS[m] + ' ' + y,
      dateStr: '28 ' + MOIS_NOMS[m] + ' ' + y
    });
  }
  return paies;
}

function renderPaieCalendrier() {
  var grid = document.getElementById('paieGrid');
  var banner = document.getElementById('paieNotifBanner');
  var bannerText = document.getElementById('paieNotifText');
  if (!grid) return;
  var today = new Date(); today.setHours(0,0,0,0);
  var paies = buildPaieCalendrier();
  grid.innerHTML = '';
  var urgentMsg = [];
  paies.forEach(function(p) {
    var diff = Math.round((p.versement - today) / 86400000);
    var card = document.createElement('div');
    var cls = 'paie-card ', alerteTxt = '', alerteCls = '';
    if (diff < 0) {
      cls += 'paie-passee';
      alerteTxt = 'Versée il y a ' + Math.abs(diff) + ' j';
    } else if (diff <= 3) {
      cls += 'paie-urgent';
      alerteTxt = '🚨 Dans ' + diff + ' jour' + (diff>1?'s':'') + ' !';
      alerteCls = 'alerte-urgent';
      urgentMsg.push(p.label + ' : ' + p.dateStr);
    } else if (diff <= 7) {
      cls += 'paie-proche';
      alerteTxt = '⚠️ Dans ' + diff + ' jours';
      alerteCls = 'alerte-proche';
    } else {
      cls += 'paie-ok';
      alerteTxt = '✅ Dans ' + diff + ' jours';
      alerteCls = 'alerte-ok';
    }
    card.className = cls;
    card.innerHTML =
      '<div class="paie-card-header">' + p.label + '</div>' +
      '<div class="paie-card-periode">Période : ' + p.periode + '</div>' +
      '<div class="paie-card-date">💳 ' + p.dateStr + '</div>' +
      (alerteTxt ? '<div class="paie-card-alerte ' + alerteCls + '">' + alerteTxt + '</div>' : '');
    grid.appendChild(card);
  });
  if (banner && bannerText) {
    if (urgentMsg.length) {
      bannerText.textContent = 'Paie imminente : ' + urgentMsg.join(' | ');
      banner.classList.add('show');
    } else {
      banner.classList.remove('show');
    }
  }
}

window.togglePaieSection = function() {
  var cont = document.getElementById('paieSectionContent');
  var btn = document.getElementById('paieSectionToggleBtn');
  if (!cont) return;
  var hidden = cont.style.display === 'none';
  cont.style.display = hidden ? '' : 'none';
  if (btn) btn.textContent = hidden ? 'Réduire ▲' : 'Afficher ▼';
};

// ── Patch de updateDashboard ─────────────────────────────────────────
function patchUpdateDashboard() {
  if (typeof updateDashboard !== 'function') return;
  var orig = updateDashboard;
  updateDashboard = function() {
    orig.apply(this, arguments);
    var secteurs = typeof getAllSelectedSecteurs === 'function' ? getAllSelectedSecteurs() : [];
    var mois = typeof getSelectedMois === 'function' ? (getSelectedMois()[0]||'Janvier') : 'Janvier';
    var annee = parseInt(document.getElementById('yearFilter').value);
    var semFlt = getSelectedSemaine();
    var data = DATA_PRODUCTION.filter(function(d) {
      return d.Annee === annee &&
             (!secteurs.length || secteurs.includes(d.Secteur)) &&
             (!semFlt || d.Semaine === semFlt);
    });
    updateCobotObjectif(data);
    updateETPDetail(secteurs, mois, annee);
    updateSemainesComparison();
    populateSemaineFilter();
  };
}

// Patcher yearFilter pour re-populer les semaines
function patchYearFilter() {
  var yrSel = document.getElementById('yearFilter');
  if (!yrSel) return;
  yrSel.addEventListener('change', function() {
    populateSemaineFilter();
    updateSemainesComparison();
  });
}

// ── Init ─────────────────────────────────────────────────────────────
function init() {
  injectCSS();
  injectSemaineFilter();
  injectCobotObjectifBar();
  injectETPDetail();
  injectNewSections();
  renderPaieCalendrier();
  populateSemaineFilter();
  patchUpdateDashboard();
  patchYearFilter();
  // Ligne objectif sur le graphique (après que Chart.js ait eu le temps de rendre)
  setTimeout(addCobotObjectifLine, 800);
  setTimeout(addCobotObjectifLine, 2000); // second attempt
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

})();
