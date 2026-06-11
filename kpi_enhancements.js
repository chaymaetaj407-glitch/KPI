// ════════════════════════════════════════════════════════════════════
// KPI Dashboard — Améliorations complètes v3
// Auto-fix filtres, filtre semaine, objectif cobot 90%, ETP posés/intérim,
// synthèse CA, tableau S-4, calendrier paie, anomalies, absences
// ════════════════════════════════════════════════════════════════════
(function () {
'use strict';

var CSS = [
'.semaine-filter-group{flex:1.2;min-width:160px}',
'.cobot-objectif-bar{display:flex;align-items:center;justify-content:space-between;padding:6px 10px;background:#f0f6ff;border-radius:6px;margin-top:6px;font-size:13px;flex-wrap:wrap;gap:6px}',
'.cobot-ecart-badge{padding:3px 10px;border-radius:12px;font-weight:700;font-size:13px}',
'.cobot-ecart-ok{background:#d4edda;color:#155724}.cobot-ecart-nok{background:#f8d7da;color:#721c24}',
'.etp-detail{font-size:12px;color:#555;margin-top:4px;display:flex;gap:8px;flex-wrap:wrap;justify-content:center}',
'.etp-detail span{background:#f0f6ff;padding:2px 8px;border-radius:10px;font-weight:600}',
'.absences-bar{display:flex;align-items:center;gap:8px;margin-top:4px;font-size:12px;color:#555;justify-content:center;flex-wrap:wrap}',
'.absences-badge{padding:2px 8px;border-radius:10px;font-weight:700;font-size:12px}',
'.absences-ok{background:#d4edda;color:#155724}.absences-warn{background:#fff3cd;color:#856404}.absences-alert{background:#f8d7da;color:#721c24}',
'.enh-section{background:#fff;border:2px solid #0066cc;border-radius:8px;padding:14px;margin-bottom:16px;box-shadow:0 2px 6px rgba(0,102,204,.08)}',
'.enh-section-title{font-size:17px;font-weight:700;color:#0066cc;margin-bottom:12px;display:flex;align-items:center;gap:8px}',
'.semaines-comp-table{width:100%;border-collapse:collapse;font-size:13px}',
'.semaines-comp-table th{background:linear-gradient(135deg,#06c 0,#004999 100%);color:#fff;padding:7px 10px;font-weight:700;text-align:center}',
'.semaines-comp-table td{padding:7px 10px;border-bottom:1px solid #e0e0e0;text-align:center}',
'.semaines-comp-table tbody tr:first-child td{background:#f0f6ff;font-weight:700;color:#003388}',
'.semaines-comp-table tbody tr:hover td{background:#f8f9fa}',
'.ecart-pos{color:#155724;font-weight:700}.ecart-neg{color:#721c24;font-weight:700}.ecart-neu{color:#6c757d}',
'.ca-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:10px;margin-top:8px}',
'.ca-card{background:#f8f9fa;border-radius:8px;padding:12px 14px;border-left:4px solid #0066cc;text-align:center}',
'.ca-card-label{font-size:11px;color:#666;margin-bottom:4px;font-weight:600;text-transform:uppercase}',
'.ca-card-val{font-size:22px;font-weight:800;color:#0066cc;letter-spacing:-0.5px}',
'.ca-card-sub{font-size:11px;color:#999;margin-top:2px}',
'.anomalie-item{display:flex;align-items:flex-start;gap:10px;padding:8px 10px;border-radius:6px;margin-bottom:6px;font-size:13px}',
'.anomalie-haute{background:#fff5f5;border-left:3px solid #dc3545}.anomalie-basse{background:#fff9f0;border-left:3px solid #fd7e14}',
'.anomalie-icon{font-size:18px;flex-shrink:0}.anomalie-detail{flex:1}',
'.anomalie-kpi{font-weight:700;color:#333}.anomalie-meta{color:#666;font-size:12px}',
'.anomalie-empty{color:#888;font-size:13px;padding:10px;text-align:center}',
'.paie-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:10px}',
'.paie-card{border-radius:8px;padding:12px 14px;border-left:4px solid #ccc;background:#f8f9fa}',
'.paie-card.paie-urgent{border-left-color:#dc3545;background:#fff5f5;box-shadow:0 0 0 2px rgba(220,53,69,.2)}',
'.paie-card.paie-proche{border-left-color:#fd7e14;background:#fff9f0}',
'.paie-card.paie-ok{border-left-color:#28a745;background:#f0fff4}',
'.paie-card.paie-passee{border-left-color:#adb5bd;opacity:.7}',
'.paie-card-header{font-weight:700;font-size:14px;color:#333;margin-bottom:3px}',
'.paie-card-periode{font-size:11px;color:#777;margin-bottom:5px}',
'.paie-card-date{font-size:15px;font-weight:800;color:#0066cc}',
'.paie-card-alerte{font-size:11px;font-weight:700;margin-top:5px;padding:3px 8px;border-radius:10px;display:inline-block}',
'.alerte-urgent{background:#f8d7da;color:#721c24}.alerte-proche{background:#fff3cd;color:#856404}.alerte-ok{background:#d4edda;color:#155724}',
'.paie-notif-banner{display:none;background:linear-gradient(135deg,#dc3545,#c0392b);color:#fff;padding:10px 16px;border-radius:6px;margin-bottom:12px;font-weight:700;font-size:14px}',
'.paie-notif-banner.show{display:flex;align-items:center;gap:10px}',
'.section-toggle-btn{padding:4px 10px;font-size:12px;background:#06c;color:#fff;border:none;border-radius:4px;cursor:pointer;margin-left:auto}'
].join('\n');

function injectCSS() {
  if (document.getElementById('kpiEnhCSS')) return;
  var s = document.createElement('style');
  s.id = 'kpiEnhCSS';
  s.textContent = CSS;
  document.head.appendChild(s);
}


// ════════════ 1. AUTO-FIX CRITIQUE : bon année + bon mois ════════════
var MOIS_ORDRE = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
var MOIS_IDS   = ['Janvier','Fevrier','Mars','Avril','Mai','Juin','Juillet','Aout','Septembre','Octobre','Novembre','Decembre'];

function autoFixYearAndMonth() {
  var maxYear = 0, bestMoisIdx = -1;
  try {
    if (typeof _D !== 'undefined') {
      _D.slice(1).forEach(function(r) {
        var y = Number(r[2]);
        if (!y || isNaN(y)) return;
        if (y > maxYear) { maxYear = y; bestMoisIdx = -1; }
        if (y === maxYear) {
          var idx = MOIS_ORDRE.indexOf(r[1]);
          if (idx > bestMoisIdx) bestMoisIdx = idx;
        }
      });
    }
  } catch(e) {}
  if (!maxYear) return;

  // Reconstruire sélecteur année avec maxYear+2 inclus
  var sel = document.getElementById('yearFilter');
  if (sel) {
    var currentYear = new Date().getFullYear();
    var ySet = new Set([currentYear-1, currentYear, currentYear+1, currentYear+2, maxYear]);
    var dataYears = [];
    try {
      if (typeof _D !== 'undefined') _D.slice(1).forEach(function(r){ var y=Number(r[2]); if(y&&!dataYears.includes(y)) dataYears.push(y); });
      if (typeof DATA_RH !== 'undefined') DATA_RH.forEach(function(d){ var y=Number(d.Annee); if(y) { ySet.add(y); if(!dataYears.includes(y)) dataYears.push(y); } });
    } catch(e) {}
    var allYears = Array.from(ySet).filter(function(y){return y>2000&&y<2100;}).sort(function(a,b){return a-b;});
    allYears = allYears.filter(function(y){return y >= maxYear-5;});
    sel.innerHTML = '';
    allYears.forEach(function(y) {
      var opt = document.createElement('option');
      opt.value = y;
      opt.textContent = dataYears.includes(y) ? String(y) : y+' (en attente)';
      if (y === maxYear) opt.selected = true;
      sel.appendChild(opt);
    });
  }

  // Cocher le bon mois (décocher tout, cocher le dernier)
  if (bestMoisIdx >= 0) {
    MOIS_IDS.forEach(function(id) {
      var el = document.getElementById('ck_mois_'+id);
      if (el) el.checked = false;
    });
    var targetId = MOIS_IDS[bestMoisIdx];
    var ckEl = document.getElementById('ck_mois_'+targetId);
    if (ckEl) ckEl.checked = true;
    var mf = document.getElementById('monthFilter');
    if (mf) mf.value = MOIS_ORDRE[bestMoisIdx];
    if (typeof updateMoisBtnLabel === 'function') updateMoisBtnLabel();
  }
}

// ════════════ 2. FILTRE SEMAINE ════════════
function injectSemaineFilter() {
  if (document.getElementById('semaineFilter')) return;
  var anneeFilter = document.getElementById('yearFilter');
  if (!anneeFilter) return;
  var anneeGroup = anneeFilter.closest ? anneeFilter.closest('.filter-group') : anneeFilter.parentElement;
  if (!anneeGroup) anneeGroup = anneeFilter.parentElement;
  if (!anneeGroup || !anneeGroup.parentElement) return;
  var div = document.createElement('div');
  div.className = 'filter-group semaine-filter-group';
  div.innerHTML = '<label>\u{1F4C5} Semaine</label><select id="semaineFilter" style="width:100%;padding:10px;border:2px solid #06c;border-radius:6px;font-size:15px;background:#fff"><option value="">Toutes les semaines</option></select>';
  anneeGroup.parentElement.insertBefore(div, anneeGroup);
  document.getElementById('semaineFilter').addEventListener('change', function() {
    if (typeof updateDashboard === 'function') updateDashboard();
  });
}

function populateSemaineFilter() {
  var sel = document.getElementById('semaineFilter');
  if (!sel || typeof DATA_PRODUCTION === 'undefined') return;
  var annee = parseInt((document.getElementById('yearFilter')||{}).value||0);
  var secteurs = typeof getAllSelectedSecteurs === 'function' ? getAllSelectedSecteurs() : [];
  var semSet = new Set();
  DATA_PRODUCTION.forEach(function(d) {
    if (d.Annee===annee && (!secteurs.length||secteurs.includes(d.Secteur)) && d.Semaine) semSet.add(d.Semaine);
  });
  var semaines = Array.from(semSet).sort(function(a,b){ return parseInt(a.replace('S',''))-parseInt(b.replace('S','')); });
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

// ════════════ 3. OBJECTIF COBOT 90% ════════════
function injectCobotObjectifBar() {
  var box = document.getElementById('boxCobot');
  if (!box || document.getElementById('cobotObjBar')) return;
  var bar = document.createElement('div');
  bar.id = 'cobotObjBar';
  bar.className = 'cobot-objectif-bar';
  bar.innerHTML = '<span>🎯 Objectif : <strong>90 %</strong></span><span>Taux moyen : <strong id="cobotMoyVal">—</strong></span><span id="cobotEcartBadge" class="cobot-ecart-badge">—</span>';
  box.appendChild(bar);
}

function updateCobotObjectif(data) {
  var rows = data.filter(function(d){ return !isNaN(d.Taux_COBOT)&&d.Taux_COBOT>0; });
  var moyEl = document.getElementById('cobotMoyVal');
  var ecartEl = document.getElementById('cobotEcartBadge');
  if (!rows.length) {
    if (moyEl) moyEl.textContent = '—';
    if (ecartEl) { ecartEl.textContent = '—'; ecartEl.className = 'cobot-ecart-badge'; }
    return;
  }
  var moy = rows.reduce(function(s,d){return s+d.Taux_COBOT;},0)/rows.length;
  if (moyEl) moyEl.textContent = moy.toFixed(1)+' %';
  if (ecartEl) {
    var diff = moy-90;
    ecartEl.textContent = (diff>=0?'✅ +':'⚠️ ')+diff.toFixed(1)+' pts vs 90%';
    ecartEl.className = 'cobot-ecart-badge '+(diff>=0?'cobot-ecart-ok':'cobot-ecart-nok');
  }
}

function addCobotObjectifLine() {
  if (typeof Chart === 'undefined') return;
  var canvas = document.getElementById('chartCobot');
  if (!canvas) return;
  var chart = Chart.getChart(canvas);
  if (!chart) return;
  if (chart.data.datasets.find(function(ds){return ds._isObjectif90;})) return;
  var n = (chart.data.labels||[]).length;
  if (!n) return;
  chart.data.datasets.push({ label:'Objectif 90%', type:'line', data:Array(n).fill(90), borderColor:'#dc3545', borderWidth:2, borderDash:[6,4], pointRadius:0, fill:false, _isObjectif90:true });
  chart.update('none');
}


// ════════════ 4. ETP POSÉS + ETP INTÉRIM + ABSENCES ════════════
function injectETPDetail() {
  if (document.getElementById('etpDetail')) return;
  var etpEl = document.getElementById('rhETP');
  if (!etpEl) return;
  var parent = etpEl.closest ? etpEl.closest('.kpi-card') : null;
  if (!parent) parent = etpEl.parentElement;
  if (!parent) return;
  var div = document.createElement('div');
  div.id = 'etpDetail';
  div.className = 'etp-detail';
  div.innerHTML = '<span id="etpPoses">Posés : —</span><span id="etpInterim">Intérim : —</span>';
  parent.appendChild(div);
  var div2 = document.createElement('div');
  div2.id = 'absencesBar';
  div2.className = 'absences-bar';
  div2.innerHTML = '<span>📅 Absences :</span><span id="absencesVal" class="absences-badge">—</span><span id="absencesNote" style="font-size:11px;color:#888"></span>';
  parent.appendChild(div2);
}

function updateETPDetail(secteurs, mois, annee) {
  if (typeof DATA_RH === 'undefined') return;
  var data = DATA_RH.filter(function(d) {
    return (!secteurs.length||secteurs.includes(d.Secteur)) && d.Mois===mois && d.Annee===annee;
  });
  var etpPosEl = document.getElementById('etpPoses');
  var etpIntEl = document.getElementById('etpInterim');
  var absVal = document.getElementById('absencesVal');
  var absNote = document.getElementById('absencesNote');
  if (!data.length) {
    if (etpPosEl) etpPosEl.textContent = 'Posés : —';
    if (etpIntEl) etpIntEl.textContent = 'Intérim : —';
    if (absVal) { absVal.textContent = '—'; absVal.className = 'absences-badge'; }
    if (absNote) absNote.textContent = '';
    return;
  }
  var totalETP = data.reduce(function(s,d){return s+(d.NB_ETP||0);},0);
  var totalInterim = data.reduce(function(s,d){return s+(d.NB_Interimaires||0);},0);
  var totalPoses = Math.max(0, totalETP-totalInterim);
  var totalAbsences = data.reduce(function(s,d){return s+(d.Heures_Absence||0);},0);
  var nbPersonnes = data.reduce(function(s,d){return s+(d.Effectif||0);},0);
  if (etpPosEl) etpPosEl.textContent = 'Posés : '+(totalPoses>0?totalPoses.toFixed(1):'—');
  if (etpIntEl) etpIntEl.textContent = 'Intérim : '+(totalInterim>0?totalInterim.toFixed(1):'—');
  if (absVal && absNote) {
    var tauxAbs = nbPersonnes>0 ? totalAbsences/nbPersonnes : 0;
    absVal.textContent = totalAbsences.toFixed(1)+' h';
    if (tauxAbs<=2) { absVal.className='absences-badge absences-ok'; absNote.textContent='≤ 2h/pers. — normal'; }
    else if (tauxAbs<=5) { absVal.className='absences-badge absences-warn'; absNote.textContent=tauxAbs.toFixed(1)+'h/pers. — à surveiller'; }
    else { absVal.className='absences-badge absences-alert'; absNote.textContent=tauxAbs.toFixed(1)+'h/pers. — 🚨 élevé'; }
  }
}

// ════════════ 5. SYNTHÈSE CA / PRIX DE VENTE ════════════
function injectCASection() {
  if (document.getElementById('caSynthSection')) return;
  var vProd = document.getElementById('versionProduction');
  if (!vProd) return;
  var div = document.createElement('div');
  div.id = 'caSynthSection';
  div.className = 'enh-section no-print';
  div.innerHTML = '<div class="enh-section-title">💰 Synthèse performance & coûts<button class="section-toggle-btn" onclick="window._toggleSect(\'caSynthContent\',this)">Réduire ▲</button></div><div id="caSynthContent"><div class="ca-grid" id="caGrid"></div></div>';
  if (vProd.nextSibling) { vProd.parentElement.insertBefore(div, vProd.nextSibling); }
  else { vProd.parentElement.appendChild(div); }
}

function updateCASection(data) {
  var grid = document.getElementById('caGrid');
  if (!grid) return;
  if (!data.length) { grid.innerHTML = '<div style="color:#888;padding:10px;font-size:13px">Aucune donnée pour cette période</div>'; return; }
  var totalProd = data.reduce(function(s,d){return s+(isNaN(d.Prod_Globale)?0:d.Prod_Globale);},0);
  var totalCout = data.reduce(function(s,d){return s+(isNaN(d.Cout_total)?0:d.Cout_total);},0);
  var vitRows = data.filter(function(d){return d.Vit_prod>0;});
  var vitMoy = vitRows.length ? vitRows.reduce(function(s,d){return s+d.Vit_prod;},0)/vitRows.length : 0;
  var coutRows = data.filter(function(d){return d.Cout_pour_1000>0;});
  var coutMoy = coutRows.length ? coutRows.reduce(function(s,d){return s+d.Cout_pour_1000;},0)/coutRows.length : 0;
  var caRows = data.filter(function(d){return d.ca&&!isNaN(d.ca)&&d.ca>0;});
  var caMoy = caRows.length ? caRows.reduce(function(s,d){return s+d.ca;},0)/caRows.length : 0;
  var hldRows = data.filter(function(d){return !isNaN(d.HLD)&&d.HLD>0;});
  var hldTot = hldRows.reduce(function(s,d){return s+d.HLD;},0);
  var cards = [
    {label:'Production totale', val:totalProd>0?Math.round(totalProd).toLocaleString('fr-FR')+' ex.':'—', sub:''},
    {label:'Coût total MOD', val:totalCout>0?Math.round(totalCout).toLocaleString('fr-FR')+' €':'—', sub:''},
    {label:'Vitesse moyenne', val:vitMoy>0?Math.round(vitMoy*1000).toLocaleString('fr-FR')+' ex/h':'—', sub:''},
    {label:'Coût / 1 000 ex.', val:coutMoy>0?coutMoy.toFixed(2)+' €':'—', sub:totalProd>0&&totalCout>0?'Calcé : '+(totalCout/totalProd*1000).toFixed(2)+' €':''},
    {label:'Respect HLD', val:hldTot>0?hldTot.toFixed(0):'—', sub:''},
    {label:'CA / Prix de vente', val:caMoy>0?caMoy.toFixed(2)+' %':'—', sub:caRows.length?caRows.length+' sem. avec données':'Non renseigné dans Excel'}
  ];
  grid.innerHTML = '';
  cards.forEach(function(c) {
    var d = document.createElement('div');
    d.className = 'ca-card';
    d.innerHTML = '<div class="ca-card-label">'+c.label+'</div><div class="ca-card-val">'+c.val+'</div>'+(c.sub?'<div class="ca-card-sub">'+c.sub+'</div>':'');
    grid.appendChild(d);
  });
}

// ════════════ 6. TABLEAU COMPARAISON S/S-4 ════════════
function injectSemainesCompSection() {
  if (document.getElementById('semainesCompSection')) return;
  var ref = document.getElementById('caSynthSection')||document.getElementById('versionProduction');
  if (!ref) return;
  var div = document.createElement('div');
  div.id = 'semainesCompSection';
  div.className = 'enh-section no-print';
  div.style.display = 'none';
  div.innerHTML = '<div class="enh-section-title">📆 Comparaison semaines — <span id="semaineCompLabel">S courante</span><button class="section-toggle-btn" onclick="window._toggleSect(\'semainesCompContent\',this)">Réduire ▲</button></div><div id="semainesCompContent"><div style="overflow-x:auto"><table class="semaines-comp-table"><thead><tr><th>Semaine</th><th>Production (ex.)</th><th>Vitesse (ex/h)</th><th>Taux Cobot</th><th>HLD</th><th>Coût/1000 €</th><th>Évol. vs préc.</th></tr></thead><tbody id="semainesCompBody"></tbody></table></div></div>';
  if (ref.nextSibling) { ref.parentElement.insertBefore(div, ref.nextSibling); }
  else { ref.parentElement.appendChild(div); }
}

function updateSemainesComparison() {
  var semFlt = getSelectedSemaine();
  var section = document.getElementById('semainesCompSection');
  var body = document.getElementById('semainesCompBody');
  var label = document.getElementById('semaineCompLabel');
  if (!section||!body) return;
  if (!semFlt) { section.style.display='none'; return; }
  section.style.display = 'block';
  if (label) label.textContent = semFlt;
  if (typeof DATA_PRODUCTION === 'undefined') return;
  var annee = parseInt((document.getElementById('yearFilter')||{}).value||0);
  var secteurs = typeof getAllSelectedSecteurs==='function' ? getAllSelectedSecteurs() : [];
  var semNum = parseInt(semFlt.replace('S',''));
  body.innerHTML = '';
  var prevProd = null;
  for (var i=0; i<5; i++) {
    var n = semNum-i, yr = annee;
    if (n<=0) { n+=52; yr--; }
    var sLabel = 'S'+String(n).padStart(2,'0');
    var rows = DATA_PRODUCTION.filter(function(d){ return d.Semaine===sLabel&&d.Annee===yr&&(!secteurs.length||secteurs.includes(d.Secteur)); });
    function agg(key){ var v=rows.reduce(function(a,d){return a+(isNaN(d[key])?0:+d[key]);},0); return v||null; }
    function avg(key){ var r=rows.filter(function(d){return d[key]>0;}); return r.length?r.reduce(function(a,d){return a+d[key];},0)/r.length:null; }
    var prod=agg('Prod_Globale'), vit=avg('Vit_prod'), cob=avg('Taux_COBOT'), hld=agg('HLD'), cout=avg('Cout_pour_1000');
    var evolHtml = '<span class="ecart-neu">—</span>';
    if (i>0&&prevProd!==null&&prod!==null) {
      var pct=(prod-prevProd)/prevProd*100;
      evolHtml='<span class="'+(pct>=0?'ecart-pos':'ecart-neg')+'">'+(pct>=0?'▲ +':'▼ ')+pct.toFixed(1)+' %</span>';
    }
    var rowLbl=(i===0?'<b>📍 ':'S-'+i+' · ')+sLabel+' ('+yr+')'+(i===0?'</b>':'');
    var tr=document.createElement('tr');
    tr.innerHTML='<td style="text-align:left">'+rowLbl+'</td><td>'+(prod?Math.round(prod).toLocaleString('fr-FR'):'—')+'</td><td>'+(vit?Math.round(vit*1000).toLocaleString('fr-FR'):'—')+'</td><td>'+(cob?cob.toFixed(1)+' %':'—')+'</td><td>'+(hld?hld.toFixed(1):'—')+'</td><td>'+(cout?cout.toFixed(2)+' €':'—')+'</td><td>'+evolHtml+'</td>';
    body.appendChild(tr);
    prevProd = prod;
  }
}


// ════════════ 7. ANOMALIES INTELLIGENTES ════════════
function injectAnomaliesSection() {
  if (document.getElementById('anomaliesSection')) return;
  var ref = document.getElementById('semainesCompSection')||document.getElementById('caSynthSection')||document.getElementById('versionProduction');
  if (!ref) return;
  var div = document.createElement('div');
  div.id = 'anomaliesSection';
  div.className = 'enh-section no-print';
  div.innerHTML = '<div class="enh-section-title">🔍 Anomalies détectées automatiquement<span id="anomalieCount" style="background:#dc3545;color:#fff;padding:2px 8px;border-radius:10px;font-size:13px;margin-left:6px">0</span><button class="section-toggle-btn" onclick="window._toggleSect(\'anomaliesContent\',this)">Réduire ▲</button></div><div id="anomaliesContent"><div id="anomaliesList"></div></div>';
  if (ref.nextSibling) { ref.parentElement.insertBefore(div, ref.nextSibling); }
  else { ref.parentElement.appendChild(div); }
}

function detectAndRenderAnomalies(filteredData) {
  var list = document.getElementById('anomaliesList');
  var countEl = document.getElementById('anomalieCount');
  if (!list) return;
  var kpis = [
    {key:'Prod_Globale', label:'Production', fmt:function(v){return Math.round(v).toLocaleString('fr-FR')+' ex.';}},
    {key:'Vit_prod', label:'Vitesse', fmt:function(v){return Math.round(v*1000).toLocaleString('fr-FR')+' ex/h';}},
    {key:'Taux_COBOT', label:'Taux Cobot', fmt:function(v){return v.toFixed(1)+' %';}},
    {key:'Cout_pour_1000', label:'Coût/1000', fmt:function(v){return v.toFixed(2)+' €';}}
  ];
  var anomalies = [];
  kpis.forEach(function(kpi) {
    var vals = filteredData.map(function(d){return d[kpi.key];}).filter(function(v){return v&&!isNaN(v)&&v>0;});
    if (vals.length<4) return;
    var mean = vals.reduce(function(s,v){return s+v;},0)/vals.length;
    var std = Math.sqrt(vals.reduce(function(s,v){return s+Math.pow(v-mean,2);},0)/vals.length);
    if (std<0.0001) return;
    filteredData.forEach(function(d) {
      var v=d[kpi.key];
      if (!v||isNaN(v)||v<=0) return;
      var z=(v-mean)/std;
      if (Math.abs(z)>2) anomalies.push({semaine:d.Semaine,mois:d.Mois,annee:d.Annee,secteur:d.Secteur,kpi:kpi.label,val:kpi.fmt(v),moy:kpi.fmt(mean),z:z,type:z>0?'haute':'basse'});
    });
  });
  anomalies.sort(function(a,b){return Math.abs(b.z)-Math.abs(a.z);});
  var top = anomalies.slice(0,8);
  if (countEl) countEl.textContent = String(top.length);
  if (!top.length) {
    list.innerHTML = '<div class="anomalie-empty">✅ Aucune anomalie — toutes les valeurs sont dans les normes statistiques</div>';
    return;
  }
  list.innerHTML = '';
  top.forEach(function(a) {
    var div = document.createElement('div');
    div.className = 'anomalie-item anomalie-'+a.type;
    div.innerHTML = '<div class="anomalie-icon">'+(a.type==='haute'?'📈':'📉')+'</div><div class="anomalie-detail"><div class="anomalie-kpi">'+a.kpi+' — valeur '+(a.type==='haute'?'anormalement élevée':'anormalement basse')+'</div><div class="anomalie-meta">'+a.semaine+' '+a.mois+' '+a.annee+' · '+a.secteur+'<br>Valeur : <strong>'+a.val+'</strong> · Moyenne : '+a.moy+' · Écart : '+(a.z>0?'+':'')+a.z.toFixed(1)+'σ</div></div>';
    list.appendChild(div);
  });
}

// ════════════ 8. CALENDRIER DE PAIE ════════════
var _MOIS_NOMS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

function injectPaieSection() {
  if (document.getElementById('paieSection')) return;
  var container = document.querySelector('.container')||document.body;
  var div = document.createElement('div');
  div.id = 'paieSection';
  div.className = 'enh-section no-print';
  div.innerHTML = '<div class="enh-section-title">💳 Calendrier des paies<button class="section-toggle-btn" onclick="window._toggleSect(\'paieSectionContent\',this)">Réduire ▲</button></div><div id="paieSectionContent"><div class="paie-notif-banner" id="paieNotifBanner">⚠️ <span id="paieNotifText"></span></div><div class="paie-grid" id="paieGrid"></div><div style="margin-top:8px;font-size:11px;color:#999">Règle : période du 15 M au 14 M+1, versement le 28 du mois M+1.</div></div>';
  container.appendChild(div);
}

function renderPaieCalendrier() {
  var grid = document.getElementById('paieGrid');
  var banner = document.getElementById('paieNotifBanner');
  var bannerText = document.getElementById('paieNotifText');
  if (!grid) return;
  var today = new Date(); today.setHours(0,0,0,0);
  var paies = [];
  var startM = today.getMonth()-1, startY = today.getFullYear();
  if (startM<0) { startM=11; startY--; }
  for (var k=0; k<12; k++) {
    var absM=startM+k, m=absM%12, y=startY+Math.floor(absM/12);
    var mDebut=m===0?11:m-1, yDebut=m===0?y-1:y;
    paies.push({versement:new Date(y,m,28),label:'Paie '+_MOIS_NOMS[m]+' '+y,periode:'15 '+_MOIS_NOMS[mDebut]+' '+yDebut+' → 14 '+_MOIS_NOMS[m]+' '+y,dateStr:'28 '+_MOIS_NOMS[m]+' '+y});
  }
  grid.innerHTML = '';
  var urgentList = [];
  paies.forEach(function(p) {
    var diff = Math.round((p.versement-today)/86400000);
    var cls='paie-card ', alerteTxt='', alerteCls='';
    if (diff<0) { cls+='paie-passee'; alerteTxt='Versée il y a '+Math.abs(diff)+' j'; }
    else if (diff<=3) { cls+='paie-urgent'; alerteCls='alerte-urgent'; alerteTxt='🚨 Dans '+diff+' jour'+(diff>1?'s':'')+' !'; urgentList.push(p.label+' : '+p.dateStr); }
    else if (diff<=7) { cls+='paie-proche'; alerteCls='alerte-proche'; alerteTxt='⚠️ Dans '+diff+' jours'; }
    else { cls+='paie-ok'; alerteCls='alerte-ok'; alerteTxt='✅ Dans '+diff+' jours'; }
    var card = document.createElement('div');
    card.className = cls;
    card.innerHTML = '<div class="paie-card-header">'+p.label+'</div><div class="paie-card-periode">'+p.periode+'</div><div class="paie-card-date">💳 '+p.dateStr+'</div>'+(alerteTxt?'<div class="paie-card-alerte '+alerteCls+'">'+alerteTxt+'</div>':'');
    grid.appendChild(card);
  });
  if (banner&&bannerText) {
    if (urgentList.length) { bannerText.textContent='Paie imminente : '+urgentList.join(' | '); banner.classList.add('show'); }
    else { banner.classList.remove('show'); }
  }
}

// ════════════ UTILITAIRE ════════════
window._toggleSect = function(id, btn) {
  var el = document.getElementById(id);
  if (!el) return;
  var hidden = el.style.display==='none';
  el.style.display = hidden ? '' : 'none';
  if (btn) btn.textContent = hidden ? 'Réduire ▲' : 'Afficher ▼';
};

// ════════════ PATCH updateDashboard ════════════
function patchUpdateDashboard() {
  if (typeof updateDashboard !== 'function' || updateDashboard._enhPatched) return;
  var orig = updateDashboard;
  window.updateDashboard = function() {
    orig.apply(this, arguments);
    try {
      var secteurs = typeof getAllSelectedSecteurs==='function' ? getAllSelectedSecteurs() : [];
      var moisList = typeof getSelectedMois==='function' ? getSelectedMois() : ['Janvier'];
      var mois = moisList[0]||'Janvier';
      var annee = parseInt((document.getElementById('yearFilter')||{}).value||0);
      var semFlt = getSelectedSemaine();
      var data = typeof DATA_PRODUCTION!=='undefined' ? DATA_PRODUCTION.filter(function(d){
        return d.Annee===annee && (!secteurs.length||secteurs.includes(d.Secteur)) && moisList.includes(d.Mois) && (!semFlt||d.Semaine===semFlt);
      }) : [];
      updateCobotObjectif(data);
      updateETPDetail(secteurs, mois, annee);
      updateCASection(data);
      detectAndRenderAnomalies(data);
      updateSemainesComparison();
      populateSemaineFilter();
      setTimeout(addCobotObjectifLine, 600);
    } catch(err) { console.warn('[kpi_enhancements] patch error:', err); }
  };
  window.updateDashboard._enhPatched = true;
}

// ════════════ INIT ════════════
function init() {
  injectCSS();
  autoFixYearAndMonth();
  injectSemaineFilter();
  injectCobotObjectifBar();
  injectETPDetail();
  injectCASection();
  injectSemainesCompSection();
  injectAnomaliesSection();
  injectPaieSection();
  renderPaieCalendrier();
  patchUpdateDashboard();
  setTimeout(function() {
    try {
      populateSemaineFilter();
      if (typeof updateDashboard==='function') updateDashboard();
    } catch(e) { console.warn('[kpi_enhancements] init error:', e); }
  }, 100);
  setTimeout(addCobotObjectifLine, 900);
}

if (document.readyState==='loading') { document.addEventListener('DOMContentLoaded', init); }
else { init(); }

})();
