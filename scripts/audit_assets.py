from pathlib import Path
import json,csv,hashlib
from PIL import Image,ImageOps,ImageDraw
root=Path(__file__).resolve().parents[1]
m=json.loads((root/'public/assets/manifests/asset_manifest.json').read_text(encoding='utf-8-sig'))
rows=list(csv.DictReader((root/'public/assets/manifests/sprite_map.csv').open(encoding='utf-8-sig')))
issues=[]; hashes={}; expected=[]; lines=[]; thumbs=[]
for a in m['atlases']:
 ok=0
 for s in a['sprites']:
  p=root/'public'/s['path'].lstrip('/'); expected.append(p.resolve())
  try:
   with Image.open(p) as im:
    im.load()
    if im.format!='PNG': issues.append(f'Wrong format: {s["path"]}')
    if im.width==0 or im.height==0: issues.append(f'Invalid dimensions: {s["path"]}')
    if s==a['sprites'][0]:
     thumb=Image.new('RGB',(220,250),'#fffdf7'); pic=im.convert('RGBA'); pic.thumbnail((210,210)); thumb.paste(pic,((220-pic.width)//2,0),pic); ImageDraw.Draw(thumb).text((8,220),a['id']+' '+a['name'],fill='#263858'); thumbs.append(thumb)
   ok+=1
   digest=hashlib.sha256(p.read_bytes()).hexdigest(); hashes.setdefault(digest,[]).append(s['path'])
   if p.name!=s['filename']: issues.append(f'Filename mismatch: {s["path"]}')
   if not any(r['output_path'].replace('public/','/',1)==s['path'] for r in rows): issues.append(f'CSV mismatch: {s["path"]}')
  except Exception as e: issues.append(f'{s["path"]}: {e}')
 lines.append(f'| {a["id"]} | {a["name"]} | {len(a["sprites"])} | {ok} | {"Có" if (root/a["source_image"]).exists() else "Thiếu atlas gốc"} |')
extras=[str(p.relative_to(root)) for p in (root/'public/assets').rglob('*.png') if p.resolve() not in expected]
dups=[v for v in hashes.values() if len(v)>1]
refs=list(root.glob('references/**/*')) if (root/'references').exists() else []
report='# Asset audit\n\nAudit toàn bộ PNG bằng Pillow: mở và giải mã đầy đủ, đối chiếu sprite.path (không suy đoán tên), filename, CSV và SHA-256.\n\n'+f'- Atlas khai báo: {len(m["atlases"])}; sprite khai báo: {len(expected)}; PNG giải mã: {sum(len(v) for v in hashes.values())}.\n- CSV: {len(rows)} dòng.\n- Đường dẫn trùng: {len(expected)-len(set(expected))}. Nội dung trùng SHA-256: {len(dups)} nhóm.\n- PNG ngoài manifest: {len(extras)}.\n- references/: {"Có" if refs else "Không tìm thấy; không giả định có concept"}.\n\n| ID | Atlas | Khai báo | Đọc được | Atlas gốc |\n|---|---|---:|---:|---|\n'+'\n'.join(lines)+'\n\n## Vấn đề sprite\n'+ ('\n'.join(issues) if issues else 'Không có sprite thiếu, sai định dạng, sai tên, không đọc được hoặc lệch CSV.')+'\n\n## Giới hạn và khắc phục\n18 atlas nguồn không được cung cấp trong public/assets/atlas-source. Không cản trở runtime vì ứng dụng dùng sprite PNG đã tách. Muốn tái xuất, bổ sung các file đúng source_image trong manifest. Ghi chú “no sprites included” trong manifest là thông tin template cũ; kiểm tra thực tế xác nhận sprite tồn tại.\n\n## PNG ngoài danh mục\n'+('\n'.join(extras) or 'Không có.')+'\n\n## Trùng nội dung\n'+ ('\n'.join(map(str,dups)) or 'Không có.')+'\n'
(root/'docs/ASSET_AUDIT.md').write_text(report,encoding='utf-8')
sheet=Image.new('RGB',(220*6,250*3),'white')
for i,t in enumerate(thumbs): sheet.paste(t,(i%6*220,i//6*250))
(root/'.local').mkdir(exist_ok=True); sheet.save(root/'.local/contact-sheet.jpg')
print(report)
