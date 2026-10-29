#!/usr/bin/env python3
"""Extend verified v0.5.5 APK with local SmartGuard Family prototype.

This builds a test artifact; it does not enable multiuser alerts or install on phones.
The private signing key must be supplied locally and NEVER committed.
"""
import argparse
import hashlib
import importlib.util
import os
import struct
import zipfile
from pathlib import Path

ORIGINAL_HELPER = Path(__file__).with_name('patch_optional_login_v054.py')
if not ORIGINAL_HELPER.exists():
    ORIGINAL_HELPER = Path(__file__).resolve().parents[1] / 'smartguard_release' / 'patch_optional_login.py'
spec=importlib.util.spec_from_file_location('smartguard_apk_signer',str(ORIGINAL_HELPER))
helper=importlib.util.module_from_spec(spec)
spec.loader.exec_module(helper)
JS='assets/public/assets/index-DWhiuSDt.js'
CSS='assets/public/smartguard-flow-v053.css'
MANIFEST='AndroidManifest.xml'


def one_replace(s, old, new):
    count=s.count(old)
    if count!=1:
        raise RuntimeError(f'Unsafe patch: expected one match for {old[:90]!r}, found {count}')
    return s.replace(old,new,1)


def patch_ui(s, family_source):
    anchor='/* SmartGuard 0.5.2 - native APK onboarding; lives inside the existing Clerk React tree. */'
    s=one_replace(s,anchor, family_source+'\n\n'+anchor)
    s=one_replace(s,
        "  const [screen, setScreen] = x.useState('loading');",
        "  const [screen, setScreen] = x.useState('loading');\n  const [familyDomain, setFamilyDomain] = x.useState('');")
    s=one_replace(s,
        "  const [detailsOpen, setDetailsOpen] = x.useState(false);",
        """  const [detailsOpen, setDetailsOpen] = x.useState(false);
  x.useEffect(() => {
    const openFamily = event => {
      const domain = event?.detail?.domain;
      setFamilyDomain(typeof domain === 'string' && domain.length <= 253 ? domain : '');
      setScreen('family');
    };
    window.addEventListener('smartguard:family-alert',openFamily);
    return () => window.removeEventListener('smartguard:family-alert',openFamily);
  }, []);""")
    s=one_replace(s,
        "  } else {\n    content=el('section',{className:'sg-panel sg-dashboard'},",
        """  } else if (screen==='family') {
    content=el(SGFamilyLocalV56,{initialDomain:familyDomain,onBack:()=>setScreen('dashboard')});
  } else {
    content=el('section',{className:'sg-panel sg-dashboard'},""")
    s=one_replace(s,
        "      el('div',{className:'sg-bottom-user'},",
        """      el('div',{className:'sgf-teaser'},
        el('span',{className:'sgf-teaser-symbol'},'\u2661'),
        el('div',{className:'sgf-teaser-content'},
          el('strong',null,'SmartGuard Family'),
          el('p',null,'Organiza personas de confianza y practica alertas familiares. Por ahora, demostraci\u00f3n local.')),
        btn('ABRIR FAMILIA',()=>{setFamilyDomain('');setScreen('family');},'secondary')),
      el('div',{className:'sg-bottom-user'},""")
    key='k.jsx("p",{className:"text-sm",children:"Comprueba el dominio desde la aplicaci\u00f3n oficial o un contacto que ya conozcas. No uses los tel\u00e9fonos del mensaje sospechoso."}),e.test?null:'
    replacement='''k.jsx("p",{className:"text-sm",children:"Comprueba el dominio desde la aplicaci\u00f3n oficial o un contacto que ya conozcas. No uses los tel\u00e9fonos del mensaje sospechoso."}),!e.test&&!e.pending&&(e.decision?.color==="red"||e.decision?.color==="orange")?k.jsx(Dt,{variant:"outline",onClick:()=>{let domain="";try{domain=new URL(e.url).hostname}catch{}window.dispatchEvent(new CustomEvent("smartguard:family-alert",{detail:{domain}}));f()},children:"Pedir ayuda a mi familia (prueba)"}):null,e.test?null:'''
    s=one_replace(s,key,replacement)
    return s


def patch_manifest(contents):
    data=bytearray(contents)
    pos=8
    while pos<len(data):
        typ,header,size=struct.unpack_from('<HHI',data,pos)
        if typ==1:
            count,styles,flags,string_start,style_start=struct.unpack_from('<IIIII',data,pos+8)
            if flags & 0x100:raise RuntimeError('Unexpected UTF-8 Android manifest')
            strings=[]
            for i in range(count):
                relative=struct.unpack_from('<I',data,pos+header+i*4)[0]
                at=pos+string_start+relative
                length=struct.unpack_from('<H',data,at)[0]
                strings.append(data[at+2:at+2+length*2].decode('utf-16-le'))
            break
        pos+=size
    else:raise RuntimeError('Cannot locate manifest string pool')
    if '0.5.5-piloto' not in strings:raise RuntimeError('The base APK is not SmartGuard 0.5.5')
    offset=struct.unpack_from('<I',data,pos+header+strings.index('0.5.5-piloto')*4)[0]
    at=pos+string_start+offset+2
    data[at:at+len('0.5.5-piloto'.encode('utf-16-le'))]='0.5.6-piloto'.encode('utf-16-le')
    changed=False;current=8
    while current<len(data):
        typ,header,size=struct.unpack_from('<HHI',data,current)
        if typ==0x102:
            ns,name,attr_start,attr_size,attr_count=struct.unpack_from('<IIHHH',data,current+16)
            if strings[name]=='manifest':
                for i in range(attr_count):
                    p=current+16+attr_start+i*attr_size
                    attrname=struct.unpack_from('<I',data,p+4)[0]
                    if strings[attrname]=='versionCode':
                        before=struct.unpack_from('<I',data,p+16)[0]
                        if before!=12:raise RuntimeError('Unexpected starting Android versionCode '+str(before))
                        struct.pack_into('<I',data,p+16,13)
                        changed=True
                break
        current+=size
    if not changed:raise RuntimeError('Cannot bump versionCode')
    return bytes(data)


def patch_zip(base,output,source,css_source):
    with zipfile.ZipFile(base,'r') as src,zipfile.ZipFile(output,'w',allowZip64=False) as dst:
        for info in src.infolist():
            content=src.read(info.filename)
            if info.filename==JS:
                content=patch_ui(content.decode('utf-8'),source).encode('utf-8')
            elif info.filename==CSS:
                content+=b'\n'+css_source.encode('utf-8')
                content+=b'''\n.sgf-teaser{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:19px 0 8px;padding:14px;border:1px solid #c5e8d1;border-radius:16px;background:#edfaf1}
.sgf-teaser-symbol{font-size:30px;color:#108d65}.sgf-teaser-content{flex:1;min-width:140px}.sgf-teaser-content strong{font-size:15px;color:#145b44}.sgf-teaser-content p{margin:3px 0!important;font-size:11px!important;color:#527264}.sgf-teaser .sg-btn{font-size:11px;padding:10px}
'''
            elif info.filename==MANIFEST:
                content=patch_manifest(content)
            item=zipfile.ZipInfo(info.filename,info.date_time)
            item.compress_type=info.compress_type
            item.create_system=info.create_system
            item.external_attr=info.external_attr
            item.internal_attr=info.internal_attr
            item.flag_bits=info.flag_bits & ~0x8
            item.comment=info.comment
            if item.compress_type==zipfile.ZIP_STORED:
                alignment=4096 if info.filename.startswith('lib/') and info.filename.endswith('.so') else 4
                offset=dst.fp.tell()+30+len(item.filename.encode())
                padding=(alignment-(offset+4)%alignment)%alignment
                item.extra=struct.pack('<HH',0xd935,padding)+b'\x00'*padding
            dst.writestr(item,content,compress_type=item.compress_type,compresslevel=6)


def verify_apk(apk,expected_signer):
    # General scheme-v2 signature verification, including APK digest integrity.
    from cryptography import x509
    from cryptography.hazmat.primitives import hashes,serialization
    from cryptography.hazmat.primitives.asymmetric import padding
    b=Path(apk).read_bytes()
    eocd=b.rfind(b'PK\x05\x06')
    cd=struct.unpack_from('<I',b,eocd+16)[0]
    block_size=struct.unpack_from('<Q',b,cd-24)[0]
    if b[cd-16:cd]!=helper.APK_MAGIC:raise RuntimeError('Missing v2 signature')
    block_start=cd-block_size-8
    pos=block_start+8
    signer_data=None
    while pos<cd-24:
        size=struct.unpack_from('<Q',b,pos)[0];pos+=8
        alg=struct.unpack_from('<I',b,pos)[0];pos+=4
        content=b[pos:pos+size-4];pos+=size-4
        if alg==helper.SIG_ID:signer_data=content
    if not signer_data:raise RuntimeError('No v2 signer data')
    def lp(content,pos=0):
        length=struct.unpack_from('<I',content,pos)[0]
        return content[pos+4:pos+4+length],pos+4+length
    signers,_=lp(signer_data);signer,_=lp(signers)
    signed_data,idx=lp(signer);sigrecords,idx=lp(signer,idx)
    sigrec,_=lp(sigrecords);signature,_=lp(sigrec,4)
    digests,idx=lp(signed_data);certificates,idx=lp(signed_data,idx)
    cert_der,_=lp(certificates)
    rec,_=lp(digests);stored_digest,_=lp(rec,4)
    cert=x509.load_der_x509_certificate(cert_der)
    cert.public_key().verify(signature,signed_data,padding.PKCS1v15(),hashes.SHA256())
    fp=hashlib.sha256(cert_der).hexdigest()
    if fp!=expected_signer:raise RuntimeError('APK signer changed')
    original_eocd=bytearray(b[eocd:]);struct.pack_into('<I',original_eocd,16,block_start)
    digest=helper.digest_apk(b[:block_start],b[cd:eocd],original_eocd)
    if digest!=stored_digest:raise RuntimeError('APK signature digest mismatch')
    with zipfile.ZipFile(apk) as z:
        if z.testzip() is not None:raise RuntimeError('APK ZIP corruption')
        js=z.read(JS).decode('utf-8')
        css=z.read(CSS).decode('utf-8')
        manifest=z.read(MANIFEST)
        for snippet in ['const SGFamilyLocalV56','Pedir ayuda a mi familia (prueba)','Continuar sin cuenta',"screen==='family'",'sgf-teaser']:
            if snippet not in js:raise RuntimeError('Expected UI feature missing: '+snippet)
        if '.sgf-family-header' not in css:raise RuntimeError('Family style missing')
        if '0.5.6-piloto'.encode('utf-16-le') not in manifest:raise RuntimeError('Version label missing')
    return {'signer_sha256':fp,'apk_sha256':hashlib.sha256(b).hexdigest(),'bytes':len(b),'version':'0.5.6-piloto','version_code':13}


def main():
    arg=argparse.ArgumentParser()
    arg.add_argument('--base',required=True);arg.add_argument('--keystore',required=True)
    arg.add_argument('--output',required=True);arg.add_argument('--password',default='android')
    args=arg.parse_args()
    base=Path(args.base);output=Path(args.output)
    source=Path(__file__).with_name('family_native_v056.js').read_text('utf-8')
    css=Path(__file__).with_name('family_native_v056.css').read_text('utf-8')
    from cryptography.hazmat.primitives.serialization import pkcs12,Encoding
    key,cert,_=pkcs12.load_key_and_certificates(Path(args.keystore).read_bytes(),args.password.encode())
    if key is None or cert is None:raise RuntimeError('Invalid signing key')
    expected=hashlib.sha256(cert.public_bytes(Encoding.DER)).hexdigest()
    # Verify base APK signer and original intent before patching.
    base_info=helper.verify(base,expected)
    unsigned=output.with_suffix('.unsigned.apk')
    try:
        patch_zip(base,unsigned,source,css)
        signer=helper.sign_v2(unsigned,output,args.keystore,args.password)
        if signer!=expected:raise RuntimeError('Signing identity mismatch')
        print(verify_apk(output,expected))
    finally:
        unsigned.unlink(missing_ok=True)

if __name__=='__main__':main()