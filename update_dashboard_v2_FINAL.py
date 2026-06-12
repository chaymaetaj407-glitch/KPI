#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script de mise à jour Dashboard KPI - v2
- Lecture rapide avec pandas
- Commentaires persistants dans feuille Excel "Commentaires"
- cout_interim et ratio calculés en Python et sauvegardés dans Excel + dashboard
"""

import pandas as pd
import json, os, sys, re, unicodedata
from datetime import datetime
import openpyxl
import numpy as np

# Sérialiseur JSON compatible numpy (évite que numpy.float64 → string "2026.0")
class NpEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, np.integer):  return int(obj)
        if isinstance(obj, np.floating): return float(obj)
        if isinstance(obj, np.ndarray):  return obj.tolist()
        if isinstance(obj, float) and obj != obj: return None  # NaN → null
        return super().default(obj)

# Répartition fixe semaines → mois (52 semaines)
SEMAINE_MOIS = {}
_s = 1
for _mois, _nb in [('Janvier',5),('Février',4),('Mars',4),('Avril',5),
    ('Mai',4),('Juin',4),('Juillet',5),('Août',4),
    ('Septembre',4),('Octobre',5),('Novembre',4),('Décembre',4)]:
    for _i in range(_nb):
        SEMAINE_MOIS[f'S{_s:02d}'] = _mois
        _s += 1

def normalize_text(text):
    if not isinstance(text, str): return ""
    text = unicodedata.normalize('NFD', text)
    text = ''.join(c for c in text if unicodedata.category(c) != 'Mn')
    return text.lower().replace('_','').replace(' ','').replace('-','')

def find_excel_files():
    return [f for f in os.listdir('.') if f.endswith(('.xlsx','.xls')) and not f.startswith('~')]

def find_html_dashboard():
    files = [f for f in os.listdir('.') if f.endswith('.html') and 'dashboard' in f.lower()]
    return files[0] if files else None

def find_sheet(xl, keywords):
    for sheet in xl.sheet_names:
        n = normalize_text(sheet)
        if any(k in n for k in keywords):
            return sheet
    return None

# ─────────────────────────────────────────────
# COMMENTAIRES
# ─────────────────────────────────────────────

def read_comments_from_excel(excel_file):
    try:
        wb = openpyxl.load_workbook(excel_file)
        if 'Commentaires' not in wb.sheetnames:
            print("   INFO: Pas de feuille Commentaires, creation...")
            wb.close()
            return {}
        ws = wb['Commentaires']
        comments = {}
        for row in ws.iter_rows(min_row=2, values_only=True):
            if row[0]:
                comments[str(row[0])] = {'type': row[1] or '', 'texte': row[2] or '', 'date': row[3] or ''}
        print(f"   OK {len(comments)} commentaires lus depuis Excel")
        wb.close()
        return comments
    except Exception as e:
        print(f"   ATTENTION lecture commentaires: {e}")
        return {}

def save_comments_to_excel(excel_file, comments):
    try:
        wb = openpyxl.load_workbook(excel_file)
        if 'Commentaires' in wb.sheetnames:
            del wb['Commentaires']
        ws = wb.create_sheet('Commentaires')
        ws.append(['Cle', 'Type', 'Texte', 'Date_modif'])
        for key, data in comments.items():
            ws.append([key, data.get('type',''), data.get('texte',''), data.get('date','')])
        wb.save(excel_file)
        print(f"   OK {len(comments)} commentaires sauvegardes dans Excel")
        wb.close()
    except Exception as e:
        print(f"   ATTENTION sauvegarde commentaires: {e}")

def extract_comments_from_html(html_content):
    m = re.search(r'const COMMENTS_SAVED\s*=\s*(\{.*?\});', html_content, re.DOTALL)
    if m:
        try: return json.loads(m.group(1))
        except: pass
    return {}

# ─────────────────────────────────────────────
# RÉCUPÉRER LES COLONNES CALCULÉES DE L'ANCIEN HTML
# ─────────────────────────────────────────────

def extract_calculated_columns(html_content):
    """
    Extraire les valeurs ca, cout_interim, ratio depuis le _D actuel du HTML.
    Clé : (Semaine, Mois, Annee, Secteur)
    """
    m = re.search(r'const _D=(\[\[[\s\S]*?\]\]);', html_content)
    if not m:
        print("   INFO: _D non trouve dans HTML existant")
        return {}
    try:
        _D = json.loads(m.group(1))
        keys = _D[0]
        rows = _D[1:]
        calculated = {}
        for r in rows:
            d = dict(zip(keys, r))
            key = (d.get('Semaine'), d.get('Mois'), d.get('Annee'), d.get('Secteur'))
            calculated[key] = {
                'ca': d.get('ca'),
                'cout_interim':   d.get('cout_interim'),
                'ratio':          d.get('ratio')
            }
        print(f"   OK {len(calculated)} lignes calculees recuperees depuis HTML")
        return calculated
    except Exception as e:
        print(f"   ATTENTION extraction _D: {e}")
        return {}

# ─────────────────────────────────────────────
# LECTURE DONNÉES
# ─────────────────────────────────────────────

def read_production_data(excel_file, calculated_cols):
    xl = pd.ExcelFile(excel_file)
    sheet = find_sheet(xl, ['bddproduction','production','prod'])
    if not sheet:
        print("   ERREUR: Feuille production introuvable!")
        return None
    df = pd.read_excel(excel_file, sheet_name=sheet)
    print(f"   Feuille production: '{sheet}' ({len(df)} lignes)")

    FACTOR_VIT = 1/10
    keys = ['Semaine','Mois','Annee','Secteur','Prod_Globale','Cout_total',
            'MOD_heures_travaillees','Vit_prod','Cout_pour_1000','HLD',
            'Taux_COBOT','Prod_Conducteur_Matin','ca',
            'cout_interim','ratio',
            'objectif_cout','objectif_vitesse','objectif_conducteur',
            'quantite_hld','quantite_hors_hld','seuil_hld','seuil_mini_hld']

    def val(r, col, default=None):
        v = r.get(col)
        if v is None: return default
        try:
            if pd.isna(v): return default  # gère numpy.float64 NaN en toute version
        except (TypeError, ValueError):
            pass
        return v

    rows = []
    for _, r in df.iterrows():
        hld     = val(r, 'HLD')
        secteur = str(val(r, 'Secteur', ''))
        semaine = val(r, 'Semaine')
        mois    = val(r, 'Mois')
        # Forcer le mois selon la répartition fixe semaines/mois (corrige minuscules et espaces)
        if semaine and semaine in SEMAINE_MOIS:
            mois = SEMAINE_MOIS[semaine]
        annee   = val(r, 'Annee')

        # ca lu depuis Excel (colonne peut s'appeler 'ca' ou 'ca_pourcentage')
        ca_pct = val(r, 'ca') or val(r, 'ca_pourcentage')

        # quantite_hld / quantite_hors_hld — lus directement depuis Excel
        qhld  = val(r, 'HLD')
        qhors = val(r, 'Hors_HLD')
        if qhld  is not None: qhld  = float(qhld)
        if qhors is not None: qhors = float(qhors)

        # Vit_prod conversion
        vit = val(r, 'Vit_prod')
        if vit is not None: vit = round(float(vit) * FACTOR_VIT, 4)

        # Prod_Conducteur_Matin (déjà en unité correcte dans Excel, pas de conversion)
        cond = val(r, 'Prod_Conducteur_Matin')
        if cond is not None: cond = float(cond)

        rows.append([
            semaine, mois, annee, secteur,
            val(r,'Prod_Globale'), val(r,'Cout_total'), val(r,'MOD_heures_travaillees'),
            vit, val(r,'Cout_pour_1000'), hld,
            val(r,'Taux_COBOT'), cond, ca_pct,
            val(r,'cout_interim',0), val(r,'ratio',0),
            val(r,'objectif_cout',20), val(r,'objectif_vitesse',6), val(r,'objectif_conducteur',40000),
            qhld, qhors, val(r,'seuil_hld',800), val(r,'seuil_mini_hld',100)
        ])

    return [keys] + rows

def read_rh_data(excel_file):
    xl = pd.ExcelFile(excel_file)
    sheet = find_sheet(xl, ['rh','admin','personnel','hr'])
    if not sheet:
        print("   INFO: Feuille RH introuvable")
        return None
    df = pd.read_excel(excel_file, sheet_name=sheet)
    df = df.where(pd.notna(df), None)
    print(f"   Feuille RH: '{sheet}' ({len(df)} lignes)")
    return df.to_dict(orient='records')

# ─────────────────────────────────────────────
# MISE À JOUR DASHBOARD
# ─────────────────────────────────────────────

def update_dashboard(html_file, prod_data, rh_data, comments):
    with open(html_file, 'r', encoding='utf-8') as f:
        content = f.read()

    prod_json = json.dumps(prod_data, ensure_ascii=False, separators=(',',':'), cls=NpEncoder)
    d_pattern = re.compile(r'const _D=\[\[[\s\S]*?\]\];')
    if d_pattern.search(content):
        content = d_pattern.sub(f'const _D={prod_json};', content, count=1)
        print("   OK _D production mis a jour")
    else:
        print("   ATTENTION: _D non trouve dans le HTML!")

    if rh_data is not None:
        rh_json = json.dumps(rh_data, ensure_ascii=False, separators=(',',':'), cls=NpEncoder)
        rh_pattern = re.compile(r'const DATA_RH\s*=\s*\[[\s\S]*?\];')
        if rh_pattern.search(content):
            content = rh_pattern.sub(f'const DATA_RH ={rh_json};', content, count=1)
            print("   OK DATA_RH mis a jour")

    comments_json = json.dumps(comments, ensure_ascii=False, separators=(',',':'))
    saved_pattern = re.compile(r'const COMMENTS_SAVED\s*=\s*\{[\s\S]*?\};')
    if saved_pattern.search(content):
        content = saved_pattern.sub(f'const COMMENTS_SAVED={comments_json};', content, count=1)
    else:
        content = content.replace('const DATA_RH =', f'const COMMENTS_SAVED={comments_json};\nconst DATA_RH =', 1)
    print(f"   OK {len(comments)} commentaires injectes")

    # Mettre à jour le titre avec le mois/année le plus récent
    try:
        if prod_data and len(prod_data) > 1:
            mois_ordre = ['Janvier','Février','Mars','Avril','Mai','Juin',
                          'Juillet','Août','Septembre','Octobre','Novembre','Décembre']
            dernier_mois = None
            derniere_annee = 0
            for row in prod_data[1:]:
                if row[2] and row[2] > derniere_annee:
                    derniere_annee = int(row[2])
            for row in prod_data[1:]:
                if row[2] and int(row[2]) == derniere_annee and row[1]:
                    idx = mois_ordre.index(row[1]) if row[1] in mois_ordre else -1
                    if dernier_mois is None or idx > mois_ordre.index(dernier_mois):
                        dernier_mois = row[1]
            if dernier_mois and derniere_annee:
                old_title = re.search(r'Dashboard KPI - France Routage - [^"<]+', content)
                if old_title:
                    content = content.replace(old_title.group(0),
                        f'Dashboard KPI - France Routage - {dernier_mois} {int(derniere_annee)}', 1)
                # Mettre à jour le mois sélectionné par défaut (select caché)
                content = re.sub(
                    r'<option value="' + dernier_mois + r'">' + dernier_mois + r'</option>',
                    f'<option value="{dernier_mois}" selected="selected">{dernier_mois}</option>',
                    content, count=1
                )
                # Retirer selected des autres mois (select caché)
                for m in mois_ordre:
                    if m != dernier_mois:
                        content = content.replace(
                            f'<option value="{m}" selected="selected">{m}</option>',
                            f'<option value="{m}">{m}</option>'
                        )

                # ── CORRECTION : mettre à jour les CHECKBOXES de mois (vrai filtre) ──
                MOIS_TO_CK = {
                    'Janvier':'Janvier','Février':'Fevrier','Mars':'Mars',
                    'Avril':'Avril','Mai':'Mai','Juin':'Juin',
                    'Juillet':'Juillet','Août':'Aout','Septembre':'Septembre',
                    'Octobre':'Octobre','Novembre':'Novembre','Décembre':'Decembre'
                }
                # Décocher tous les mois
                for ck_id in MOIS_TO_CK.values():
                    content = re.sub(
                        rf'(id="ck_mois_{ck_id}")\s+checked\b',
                        rf'\1',
                        content
                    )
                # Cocher uniquement le dernier mois
                if dernier_mois in MOIS_TO_CK:
                    ck_id = MOIS_TO_CK[dernier_mois]
                    content = re.sub(
                        rf'(id="ck_mois_{ck_id}")',
                        rf'\1 checked',
                        content,
                        count=1
                    )
                    print(f"   OK Checkbox mois mis a jour: {dernier_mois}")

                # ── CORRECTION : mettre à jour le dropdown ANNÉE ──
                annee_str = str(int(derniere_annee))
                # Retirer selected de toutes les options année
                content = re.sub(
                    r'(<option value="(\d{4})")\s+selected\b([^>]*>)',
                    r'\1\3',
                    content
                )
                # Ajouter selected à la bonne année (si l'option existe)
                if re.search(rf'<option value="{annee_str}"[^>]*>', content):
                    content = re.sub(
                        rf'(<option value="{annee_str}")([^>]*>)',
                        rf'\1 selected\2',
                        content,
                        count=1
                    )
                else:
                    # L'année n'existe pas encore dans le HTML → l'injecter
                    content = re.sub(
                        r'(<select[^>]*id="yearFilter"[^>]*>)',
                        rf'\1<option value="{annee_str}" selected>{annee_str}</option>',
                        content,
                        count=1
                    )
                print(f"   OK Dropdown annee mis a jour: {annee_str}")
                print(f"   OK Titre mis a jour: {dernier_mois} {int(derniere_annee)}")
    except Exception as e:
        print(f"   INFO: Titre non mis a jour: {e}")

    with open(html_file, 'w', encoding='utf-8') as f:
        f.write(content)

# ─────────────────────────────────────────────
# NETTOYAGE DONNÉES ANCIENNES (garde 5 ans)
# ─────────────────────────────────────────────

def clean_old_data(excel_file, keep_years=5):
    """
    Supprime les données de plus de 5 ans dans BDD_Production et BDD_RH.
    """
    try:
        from datetime import datetime
        current_year = datetime.now().year
        min_year = current_year - keep_years + 1

        xl = pd.ExcelFile(excel_file)
        sheet_prod = find_sheet(xl, ['bddproduction','production','prod'])
        sheet_rh   = find_sheet(xl, ['rh','admin','personnel','hr'])

        changed = False

        # Nettoyer BDD_Production
        if sheet_prod:
            df = pd.read_excel(excel_file, sheet_name=sheet_prod)
            df = df.dropna(subset=['Semaine'])
            df['Annee'] = pd.to_numeric(df['Annee'], errors='coerce')
            df = df.dropna(subset=['Annee'])
            df['Annee'] = df['Annee'].astype(int)
            before = len(df)
            df = df[df['Annee'] >= min_year]
            after = len(df)
            if before != after:
                wb = openpyxl.load_workbook(excel_file)
                del wb[sheet_prod]
                wb.save(excel_file)
                with pd.ExcelWriter(excel_file, engine='openpyxl', mode='a') as writer:
                    df.to_excel(writer, sheet_name=sheet_prod, index=False)
                print(f"   OK Production : {before-after} lignes supprimées (avant {min_year})")
                changed = True
            else:
                print(f"   OK Production : aucune donnée à supprimer (min année: {min_year})")

        # Nettoyer BDD_RH
        if sheet_rh:
            df = pd.read_excel(excel_file, sheet_name=sheet_rh)
            df['Annee'] = pd.to_numeric(df['Annee'], errors='coerce')
            df = df.dropna(subset=['Annee'])
            df['Annee'] = df['Annee'].astype(int)
            before = len(df)
            df = df[df['Annee'] >= min_year]
            after = len(df)
            if before != after:
                wb = openpyxl.load_workbook(excel_file)
                del wb[sheet_rh]
                wb.save(excel_file)
                with pd.ExcelWriter(excel_file, engine='openpyxl', mode='a') as writer:
                    df.to_excel(writer, sheet_name=sheet_rh, index=False)
                print(f"   OK RH : {before-after} lignes supprimées (avant {min_year})")
            else:
                print(f"   OK RH : aucune donnée à supprimer")

    except Exception as e:
        print(f"   ATTENTION nettoyage: {e}")

# ─────────────────────────────────────────────
# CALCUL AUTOMATIQUE cout_interim + ratio dans Excel
# ─────────────────────────────────────────────

def calculate_and_save_kpis(excel_file):
    """
    Calcule et sauvegarde cout_interim et ratio dans BDD_Production :
    - cout_interim : jointure avec feuille RH sur Secteur+Mois+Annee
    - ratio        : (ca / Cout_pour_1000) * 100  en %
    """
    try:
        xl = pd.ExcelFile(excel_file)
        sheet_prod = find_sheet(xl, ['bddproduction','production','prod'])
        sheet_rh   = find_sheet(xl, ['rh','admin','personnel','hr'])
        if not sheet_prod or not sheet_rh:
            print("   ATTENTION: feuille prod ou RH introuvable")
            return

        df_prod = pd.read_excel(excel_file, sheet_name=sheet_prod)
        df_rh   = pd.read_excel(excel_file, sheet_name=sheet_rh)

        df_rh_key = df_rh[['Secteur','Mois','Annee','Cout_interim','Montant_MS']].copy()
        df_rh_key['Annee'] = df_rh_key['Annee'].astype(int)
        df_prod['Annee']   = df_prod['Annee'].astype(int)

        # Supprimer les anciennes colonnes si elles existent déjà
        for col in ['cout_interim','ratio','Cout_interim','Montant_MS']:
            if col in df_prod.columns:
                df_prod = df_prod.drop(columns=[col])

        df_merged = df_prod.merge(df_rh_key, on=['Secteur','Mois','Annee'], how='left')

        # cout_interim → lu directement depuis feuille RH
        df_merged['cout_interim'] = df_merged['Cout_interim'].fillna(0)

        # ratio → lu directement depuis BDD_Production (déjà calculé)
        if 'ratio' not in df_merged.columns:
            df_merged['ratio'] = df_merged.apply(
                lambda r: round((r['ca'] / r['Cout_pour_1000']) * 100, 2)
                if pd.notna(r.get('Cout_pour_1000')) and r['Cout_pour_1000'] > 0
                and pd.notna(r.get('ca')) else 0,
                axis=1
            )

        df_final = df_merged.drop(columns=['Cout_interim','Montant_MS'], errors='ignore')

        # Sauvegarder dans Excel
        wb = openpyxl.load_workbook(excel_file)
        if sheet_prod in wb.sheetnames:
            del wb[sheet_prod]
        wb.save(excel_file)

        with pd.ExcelWriter(excel_file, engine='openpyxl', mode='a') as writer:
            df_final.to_excel(writer, sheet_name=sheet_prod, index=False)

        print(f"   OK cout_interim et ratio calculés et sauvegardés ({len(df_final)} lignes)")

    except Exception as e:
        print(f"   ATTENTION calcul KPIs: {e}")
        import traceback; traceback.print_exc()


# ─────────────────────────────────────────────
# IMPORT AUTOMATIQUE FICHIER MANAGER (bilan_prod_semaine)
# ─────────────────────────────────────────────

def find_manager_files():
    """Detecte les fichiers bilan production du manager dans le dossier courant."""
    keywords = ['bilan', 'prod', 'semaine', 'routage', 'hebdo']
    bdd_keywords = ['bdd', 'kpi', 'dashboard']
    found = []
    for f in os.listdir('.'):
        if not f.endswith(('.xlsx', '.xls')) or f.startswith('~'):
            continue
        fname = normalize_text(f)
        # Exclure la BDD principale
        if any(k in fname for k in bdd_keywords):
            continue
        # Inclure si contient un mot-clé manager
        if any(k in fname for k in keywords):
            found.append(f)
    return found

def detect_semaine_from_filename(filename):
    """Extrait le numéro de semaine et l'année depuis le nom du fichier."""
    import re
    # Cherche patterns: s23, s_23, semaine23, S23, 2026_s23, s23_2026
    patterns = [
        r'(\d{4})[_\-]s(\d{1,2})',   # 2026_s23
        r's(\d{1,2})[_\-](\d{4})',   # s23_2026
        r's[_\-]?(\d{1,2})',          # s23 ou s_23 (sans année)
        r'semaine[_\-]?(\d{1,2})',    # semaine23
    ]
    fname = filename.lower()
    for pat in patterns:
        m = re.search(pat, fname)
        if m:
            groups = m.groups()
            if len(groups) == 2:
                # Déterminer lequel est l'année et lequel est la semaine
                g0, g1 = int(groups[0]), int(groups[1])
                if g0 > 100:  # g0 est l'année
                    return f'S{g1:02d}', g0
                else:           # g1 est l'année
                    return f'S{g0:02d}', g1
            else:
                sem = int(groups[0])
                annee = datetime.now().year
                return f'S{sem:02d}', annee
    return None, None

def import_manager_file(manager_file, bdd_excel):
    """
    Lit un fichier bilan manager (78 lignes/magazines),
    calcule les KPIs agrégés et les insère dans la BDD Excel.
    Retourne True si une nouvelle ligne a été ajoutée.
    """
    print(f"\n   Fichier manager detecte : {manager_file}")

    # Détecter semaine et année depuis le nom du fichier
    semaine, annee = detect_semaine_from_filename(manager_file)
    if not semaine:
        print(f"   ATTENTION: impossible de detecter la semaine depuis '{manager_file}'")
        print("   Nommez le fichier avec ex: bilan_prod_s23_2026.xlsx")
        return False

    # Déterminer le mois depuis la semaine
    mois = SEMAINE_MOIS.get(semaine)
    if not mois:
        print(f"   ATTENTION: semaine {semaine} inconnue")
        return False

    print(f"   Semaine detectee : {semaine} | Mois : {mois} | Annee : {annee}")

    # Lire la BDD existante
    xl = pd.ExcelFile(bdd_excel)
    sheet_prod = find_sheet(xl, ['bddproduction', 'production', 'prod'])
    if not sheet_prod:
        print("   ERREUR: feuille production introuvable dans BDD")
        return False

    df_bdd = pd.read_excel(bdd_excel, sheet_name=sheet_prod)

    # Corriger les mois mal formatés dans toute la BDD (minuscules, espaces...)
    def fix_mois(row):
        sem = row.get('Semaine')
        if isinstance(sem, str) and sem in SEMAINE_MOIS:
            return SEMAINE_MOIS[sem]
        return row.get('Mois')
    df_bdd['Mois'] = df_bdd.apply(fix_mois, axis=1)

    # Supprimer lignes vides (sans Semaine)
    df_bdd = df_bdd.dropna(subset=['Semaine'])

    # Vérifier si la semaine+année existe déjà ET a des données de production
    try:
        annee_num = float(annee)
        annees    = pd.to_numeric(df_bdd['Annee'], errors='coerce')
        prods     = pd.to_numeric(df_bdd['Prod_Globale'], errors='coerce')
        semaines  = df_bdd['Semaine'].astype(str).str.strip()
        secteurs  = df_bdd['Secteur'].astype(str).str.strip()
        mask = (semaines == semaine) & (annees == annee_num) & (secteurs == 'Routage GT') & (prods > 0)
        already = df_bdd[mask]
    except Exception as e:
        print(f"   INFO: erreur verification doublon: {e}")
        already = pd.DataFrame()

    if len(already) > 0:
        print(f"   INFO: {semaine} {annee} existe deja dans la BDD avec donnees -> pas de doublon")
        return False

    # Lire le fichier manager
    try:
        df_m = pd.read_excel(manager_file, dtype=str)
    except Exception as e:
        print(f"   ERREUR lecture fichier manager: {e}")
        return False

    # Détecter les colonnes (robuste aux variantes de noms)
    col_map = {}
    for col in df_m.columns:
        cn = normalize_text(col)
        if 'qtteprod' in cn or ('qtte' in cn and 'prod' in cn): col_map['Qtteprod'] = col
        elif 'vprod' in cn and 'prev' not in cn:                 col_map['Vprod'] = col
        elif 'vprev' in cn or ('vpre' in cn):                    col_map['Vprev'] = col
        elif 'nbrobot' in cn or 'robot' in cn:                   col_map['Nbrobot'] = col
        elif 'nbmach' in cn or ('nb' in cn and 'mach' in cn):    col_map['Nbmach'] = col
        elif 'nbmargeur' in cn or 'margeur' in cn:               col_map['Nbmargeur'] = col
        elif 'tempsreel' in cn or ('temps' in cn and 'reel' in cn): col_map['Tempsreel'] = col

    print(f"   Colonnes detectees: {col_map}")

    # Nettoyage numérique (espaces insécables comme séparateurs de milliers)
    def clean_num(series):
        return pd.to_numeric(
            series.astype(str).str.replace('\xa0', '').str.replace(' ', '').str.replace(',', '.'),
            errors='coerce'
        )

    for key, col in col_map.items():
        df_m[col] = clean_num(df_m[col])

    # Calcul des KPIs agrégés
    def get_col(key):
        return df_m[col_map[key]] if key in col_map else pd.Series([float('nan')] * len(df_m))

    qtteprod  = get_col('Qtteprod')
    vprod     = get_col('Vprod')
    vprev     = get_col('Vprev')
    nbrobot   = get_col('Nbrobot')
    tempsreel = get_col('Tempsreel')

    prod_globale    = qtteprod.sum()
    mod_heures      = tempsreel.sum()
    vit_prod_excel  = vprod.mean() / 100          # HTML = vit*1/10, donc Excel = val_réelle/100
    taux_cobot      = (nbrobot > 0).sum() / max(len(df_m), 1) * 100
    # HLD = titres livrés dans les délais (Vprod >= Vprév)
    mask_hld        = vprod >= vprev
    hld_val         = qtteprod[mask_hld].sum() / 1000    # en milliers comme la BDD
    hors_hld_val    = qtteprod[~mask_hld].sum() / 1000

    print(f"   KPIs calcules:")
    print(f"     Prod_Globale          : {prod_globale:,.0f} ex")
    print(f"     MOD_heures            : {mod_heures:.2f} h")
    print(f"     Vit_prod (Excel)      : {vit_prod_excel:.4f}  -> HTML: {vit_prod_excel/10:.4f}K ex/h")
    print(f"     Taux_COBOT            : {taux_cobot:.2f}%")
    print(f"     HLD                   : {hld_val:.3f}K ex")
    print(f"     Hors_HLD              : {hors_hld_val:.3f}K ex")

    # Construire la nouvelle ligne
    new_row = {col: None for col in df_bdd.columns}
    new_row.update({
        'Semaine':               semaine,
        'Mois':                  mois,
        'Annee':                 float(annee),
        'Secteur':               'Routage GT',
        'Prod_Globale':          prod_globale if prod_globale > 0 else None,
        'Cout_total':            None,
        'MOD_heures_travaillees': mod_heures if mod_heures > 0 else None,
        'Vit_prod':              vit_prod_excel if not pd.isna(vit_prod_excel) else None,
        'Cout_pour_1000':        None,
        'HLD':                   hld_val if hld_val > 0 else None,
        'Hors_HLD':              hors_hld_val if hors_hld_val > 0 else None,
        'Taux_COBOT':            taux_cobot if taux_cobot >= 0 else None,
        'Prod_Conducteur_Matin': None,
        'Prod_Conducteur_Soir':  None,
        'ca_pourcentage':        None,
        'objectif_cout':         None,
        'cout_interim':          None,
        'ratio':                 None,
    })

    # Ajouter dans la BDD et sauvegarder
    df_bdd = pd.concat([df_bdd, pd.DataFrame([new_row])], ignore_index=True)

    # Lire toutes les feuilles pour ne pas les écraser
    all_sheets = {}
    wb_all = pd.ExcelFile(bdd_excel)
    for sh in wb_all.sheet_names:
        if sh == sheet_prod:
            all_sheets[sh] = df_bdd
        else:
            all_sheets[sh] = pd.read_excel(bdd_excel, sheet_name=sh)

    with pd.ExcelWriter(bdd_excel, engine='openpyxl') as writer:
        for sh, df_sh in all_sheets.items():
            df_sh.to_excel(writer, sheet_name=sh, index=False)

    print(f"   ✅ {semaine} {annee} ajoutee dans la BDD Excel !")
    return True


# ─────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────

def main():
    print("=" * 60)
    print("   DASHBOARD KPI - MISE A JOUR AUTOMATIQUE v2")
    print("   Donnees + Commentaires persistants dans Excel")
    print("=" * 60)
    try:
        excel_files = find_excel_files()
        if not excel_files:
            print("\nERREUR: Aucun fichier Excel trouve!")
            input("\nAppuyez sur Entree..."); sys.exit(1)

        # Identifier la BDD principale (contient 'bdd' ou 'kpi' dans le nom)
        bdd_keywords_id = ['bdd', 'kpi']
        bdd_files = [f for f in excel_files if any(k in normalize_text(f) for k in bdd_keywords_id)]
        if bdd_files:
            excel_file = sorted(bdd_files)[-1]
        else:
            excel_file = sorted(excel_files)[-1]
        print(f"\nFichier BDD    : {excel_file}")

        html_file = find_html_dashboard()
        if not html_file:
            print("\nERREUR: Dashboard HTML non trouve!")
            input("\nAppuyez sur Entree..."); sys.exit(1)
        print(f"Dashboard HTML : {html_file}")

        # ── ÉTAPE 0 : Détecter et importer fichiers manager ──
        manager_files = find_manager_files()
        if manager_files:
            print(f"\nEtape 0/4 : Import fichiers manager ({len(manager_files)} detecte(s))...")
            for mf in manager_files:
                imported = import_manager_file(mf, excel_file)
                if imported:
                    print(f"   -> '{mf}' integre avec succes")
                else:
                    print(f"   -> '{mf}' ignore (deja present ou erreur)")
        else:
            print("\nEtape 0/4 : Aucun fichier manager detecte (normal si deja integre)")

        # Lire le HTML actuel
        with open(html_file, 'r', encoding='utf-8') as f:
            html_content = f.read()

        # Étape 1 : Commentaires
        print("\nEtape 1/4 : Lecture des commentaires...")
        comments = read_comments_from_excel(excel_file)
        if not comments:
            print("   Tentative extraction depuis HTML...")
            comments = extract_comments_from_html(html_content)
            if comments:
                print(f"   OK {len(comments)} commentaires extraits du HTML")
                save_comments_to_excel(excel_file, comments)
            else:
                print("   INFO: Aucun commentaire existant")

        # Étape 1b : Nettoyage données anciennes (garde 5 ans)
        print("\nEtape 1b/4 : Nettoyage donnees anciennes (garde 5 ans)...")
        clean_old_data(excel_file, keep_years=5)

        # Étape 2 : Lecture production (cout_interim et ratio déjà dans Excel)
        print("\nEtape 2/4 : Lecture donnees production...")
        prod_data = read_production_data(excel_file, {})
        if prod_data is None:
            input("\nAppuyez sur Entree..."); sys.exit(1)
        print(f"   OK {len(prod_data)-1} lignes")

        # Étape 3b : RH
        print("\nEtape 3b/4 : Lecture donnees RH...")
        rh_data = read_rh_data(excel_file)
        if rh_data: print(f"   OK {len(rh_data)} lignes")

        # Étape 4 : Mise à jour
        print("\nEtape 4/4 : Mise a jour du dashboard...")
        update_dashboard(html_file, prod_data, rh_data, comments)
        save_comments_to_excel(excel_file, comments)

        print("\n" + "=" * 60)
        print("MISE A JOUR REUSSIE !")
        print(f"  Production   : {len(prod_data)-1} lignes")
        print(f"  RH           : {len(rh_data) if rh_data else 0} lignes")
        print(f"  Commentaires : {len(comments)}")
        print(f"  Date : {datetime.now().strftime('%d/%m/%Y a %H:%M:%S')}")
        print("=" * 60)

    except Exception as e:
        print(f"\nERREUR : {e}")
        import traceback; traceback.print_exc()

    input("\nAppuyez sur Entree pour fermer...")

if __name__ == "__main__":
    main()
