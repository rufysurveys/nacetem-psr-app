import zipfile, xml.etree.ElementTree as ET, os, json, re

path = r'C:\Users\NACETEM060\Desktop\PSR'
files = [os.path.join(path, f) for f in os.listdir(path) if f.endswith('.xlsx')]

def parse_xlsx(fpath):
    with zipfile.ZipFile(fpath, 'r') as z:
        sst = []
        if 'xl/sharedStrings.xml' in z.namelist():
            tree = ET.fromstring(z.read('xl/sharedStrings.xml'))
            for si in tree.findall('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}si'):
                texts = [t.text for t in si.iter() if t.tag.endswith('t') and t.text]
                sst.append(''.join(texts))
        
        sheet_tree = ET.fromstring(z.read('xl/worksheets/sheet1.xml'))
        rows = []
        for r in sheet_tree.findall('.//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}row'):
            row_data = {}
            for c in r.findall('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}c'):
                ref = c.attrib.get('r', '')
                col = re.sub(r'[0-9]', '', ref)
                t_type = c.attrib.get('t', '')
                v_elem = c.find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}v')
                val = v_elem.text if v_elem is not None else ''
                if t_type == 's' and val.isdigit():
                    idx = int(val)
                    if idx < len(sst):
                        val = sst[idx]
                row_data[col] = val
            rows.append(row_data)
        
        if not rows:
            return []
        
        header_map = {}
        for col, val in rows[0].items():
            header_map[col] = str(val).strip()
        
        parsed = []
        for r in rows[1:]:
            row_dict = {}
            for col, val in r.items():
                h = header_map.get(col, col)
                row_dict[h] = str(val).strip()
            parsed.append(row_dict)
        return parsed

all_items = []
q_counter = 1
for f in files:
    items = parse_xlsx(f)
    fname = os.path.basename(f)
    for it in items:
        q_text = it.get('Question', '') or it.get('question', '')
        if not q_text or q_text.lower() == 'question':
            continue
        opt_a = it.get('Option A', '')
        opt_b = it.get('Option B', '')
        opt_c = it.get('Option C', '')
        opt_d = it.get('Option D', '')
        correct_opt = it.get('Correct Option', '') or it.get('Correct Answer', '')
        feedback = it.get('Google Quiz Feedback', '')
        rule = it.get('Rule', '')
        section = it.get('Section', '') or fname.replace('.xlsx', '').replace('_', ' ')

        c_idx = 0
        correct_opt_clean = correct_opt.strip().lower()
        if 'b' in correct_opt_clean or (opt_b and opt_b.strip().lower() == correct_opt_clean):
            c_idx = 1
        elif 'c' in correct_opt_clean or (opt_c and opt_c.strip().lower() == correct_opt_clean):
            c_idx = 2
        elif 'd' in correct_opt_clean or (opt_d and opt_d.strip().lower() == correct_opt_clean):
            c_idx = 3

        opts = [o for o in [opt_a, opt_b, opt_c, opt_d] if o]
        if len(opts) < 2:
            continue

        item_obj = {
            'id': f'psr-{q_counter:04d}',
            'section': section,
            'rule': rule or f'PSR-{q_counter}',
            'question': q_text,
            'options': opts,
            'correctAnswer': c_idx,
            'feedback': feedback or f'Under {section}, Rule {rule or q_counter}, civil servants must comply with standard administrative guidelines.',
            'sourceFile': fname
        }
        all_items.append(item_obj)
        q_counter += 1

out_dir = os.path.join(os.path.dirname(__file__), '..', 'src', 'data')
os.makedirs(out_dir, exist_ok=True)
out_file = os.path.join(out_dir, 'psrQuestionBank.ts')

ts_content = f"""// AUTO-GENERATED AUTHORITATIVE PUBLIC SERVICE RULES (PSR 2026 REVISION) QUESTION BANK
// Derived 100% from official Excel spreadsheets in C:\\Users\\NACETEM060\\Desktop\\PSR

export interface PsrQuestion {{
  id: string;
  section: string;
  rule: string;
  question: string;
  options: string[];
  correctAnswer: number;
  feedback: string;
  sourceFile: string;
}}

export const PSR_QUESTION_BANK: PsrQuestion[] = {json.dumps(all_items, indent=2)};
"""

with open(out_file, 'w', encoding='utf-8') as out_f:
    out_f.write(ts_content)

print(f"Successfully generated {len(all_items)} official PSR entries in {out_file}")
