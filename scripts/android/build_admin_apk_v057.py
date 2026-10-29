#!/usr/bin/env python3
"""Reproducible test-only SmartGuard v0.5.7 admin monitor patch.

Preserves the newer 0.5.6 pilot native Android/Capacitor UI. No private
signing key, password, or paid subscription is added to the repository.

The monitor shows LOCAL statistics and an explicitly marked DEMO until a
separate SmartGuard Supabase project has been deployed and configured.
"""
import argparse
import hashlib
import io
import json
import re
import struct
import zipfile
from pathlib import Path
from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives.serialization import pkcs12

APK_MAGIC=b'APK Sig Block 42'; SIG_ID=0x7109871a; RSA_SHA256=0x0103; MB=1024*1024
JS='assets/public/assets/index-DWhiuSDt.js'
CSS='assets/public/smartguard-flow-v053.css'
MANIFEST='AndroidManifest.xml'
CONFIG='assets/public/smartguard-telemetry.json'
ANCHOR='/* SmartGuard 0.5.2 - native APK onboarding; lives inside the existing Clerk React tree. */'

def once(s, original, replacement):
    count=s.count(original)
    if count!=1:
        raise ValueError(f'Expected one match for {original[:70]!r}, found {count}')
    return s.replace(original,replacement,1)

def patch_js(code, admin_source):
    code=once(code,ANCHOR,admin_source+'\n\n'+ANCHOR)
    code=once(code,"['permissions','success','dashboard'].includes(screen)","['permissions','success','dashboard','admin'].includes(screen)")
    code=once(code,
        "  } else if (screen==='family') {",
        "  } else if (screen==='admin') {\n"
        "    content=el(SGAdminPanelV57,{localStatus:permissionState,onBack:()=>setScreen('dashboard'),onOpenLogin:()=>setScreen('login')});\n"
        "  } else if (screen==='family') {")
    code=once(code,
        "      el('div',{className:'sg-bottom-user'},",
        "      el('div',{className:'sga-teaser'},\n"
        "        el('div',{className:'sga-teaser-head'},el('span',{className:'sga-teaser-icon'},'▦'),\n"
        "          el('div',null,el('strong',null,'Centro de administración'),el('p',null,'Monitorea dispositivos y consulta análisis. Datos reales solo con servidor y autorización.'))),\n"
        "        btn('ABRIR ADMINISTRADOR',()=>setScreen('admin'),'secondary')),\n"
        "      el('div',{className:'sg-bottom-user'},")
    return code

def patch_manifest(raw):
    b=bytearray(raw);pos=8;strings=[]
    while pos<len(b):
        typ,header,size=struct.unpack_from('<HHI',b,pos)
        if typ==1:
            count,styles,flags,string_start,style_start=struct.unpack_from('<IIIII',b,pos+8)
            if flags&0x100:raise ValueError('Unexpected UTF8 Android manifest')
            for i in range(count):
                off=struct.unpack_from('<I',b,pos+header+i*4)[0]
                at=pos+string_start+off;length=struct.unpack_from('<H',b,at)[0]
                strings.append(b[at+2:at+2+2*length].decode('utf-16-le'))
            break
        pos+=size
    if '0.5.6-piloto' not in strings:raise ValueError('Unsupported base APK version')
    off=struct.unpack_from('<I',b,pos+header+strings.index('0.5.6-piloto')*4)[0]
    at=pos+string_start+off+2
    b[at:at+len('0.5.6-piloto'.encode('utf-16-le'))]='0.5.7-piloto'.encode('utf-16-le')
    changed=False;cur=8
    while cur<len(b):
        typ,header,size=struct.unpack_from('<HHI',b,cur)
        if typ==0x102:
            ns,name,attr_start,attr_size,attr_count=struct.unpack_from('<IIHHH',b,cur+16)
            if strings[name]=='manifest':
                for i in range(attr_count):
                    a=cur+16+attr_start+i*attr_size
                    attrname=struct.unpack_from('<I',b,a+4)[0]
                    if strings[attrname]=='versionCode':
                        previous=struct.unpack_from('<I',b,a+16)[0]
                        if previous!=13:raise ValueError(f'Expected versionCode 13, found {previous}')
                        struct.pack_into('<I',b,a+16,14);changed=True
                break
        cur+=size
    if not changed:raise ValueError('Android versionCode was not patched')
    return bytes(b)

def zip_align(source,output,source_js,css_source,config):
    with zipfile.ZipFile(source) as old,zipfile.ZipFile(output,'w',allowZip64=False) as target:
        contents=set()
        for info in old.infolist():
            raw=old.read(info.filename)
            if info.filename==JS:raw=patch_js(raw.decode('utf-8'),source_js).encode('utf-8')
            elif info.filename==CSS:raw+=b'\n'+css_source.encode('utf-8')+b'\n'
            elif info.filename==MANIFEST:raw=patch_manifest(raw)
            if info.filename==CONFIG:raw=json.dumps(config).encode('utf-8')
            write(target,info,raw)
            contents.add(info.filename)
        if CONFIG not in contents:
            write(target,zipfile.ZipInfo(CONFIG),json.dumps(config,separators=(',',':')).encode('utf-8'))

def write(target,info,data):
    member=zipfile.ZipInfo(info.filename,info.date_time)
    member.compress_type=info.compress_type;member.create_system=info.create_system
    member.external_attr=info.external_attr;member.internal_attr=info.internal_attr
    member.flag_bits=info.flag_bits&~0x8;member.comment=info.comment
    if member.compress_type==zipfile.ZIP_STORED:
        alignment=4096 if info.filename.startswith('lib/') and info.filename.endswith('.so') else 4
        offset=target.fp.tell()+30+len(member.filename.encode('utf-8'))
        amount=(alignment-(offset+4)%alignment)%alignment
        member.extra=struct.pack('<HH',0xd935,amount)+b'\x00'*amount
    target.writestr(member,data,compress_type=member.compress_type,compresslevel=6)

def lp(value):return struct.pack('<I',len(value))+value

def digest_apk(sections):
    blocks=[]
    for part in sections:
        for offset in range(0,len(part),MB):
            chunk=part[offset:offset+MB]
            blocks.append(hashlib.sha256(b'\xa5'+struct.pack('<I',len(chunk))+chunk).digest())
    return hashlib.sha256(b'\x5a'+struct.pack('<I',len(blocks))+b''.join(blocks)).digest()

def split_unsigned(data):
    eocd=data.rfind(b'PK\x05\x06')
    if eocd<0 or eocd+22!=len(data):raise ValueError('Unsupported ZIP footer')
    start=struct.unpack_from('<I',data,eocd+16)[0]
    return start,data[:start],data[start:eocd],data[eocd:]

def sign_v2(unsigned,signed,keystore,password):
    key,cert,_=pkcs12.load_key_and_certificates(Path(keystore).read_bytes(),password.encode('utf-8'))
    if key is None or cert is None:raise ValueError('APK signing credentials unavailable')
    raw=Path(unsigned).read_bytes();cd,pre,directory,eocd=split_unsigned(raw)
    digest=digest_apk((pre,directory,eocd))
    certificate=cert.public_bytes(serialization.Encoding.DER)
    signed_data=lp(lp(struct.pack('<I',RSA_SHA256)+lp(digest)))+lp(lp(certificate))+lp(b'')
    signature=key.sign(signed_data,padding.PKCS1v15(),hashes.SHA256())
    signatures=lp(struct.pack('<I',RSA_SHA256)+lp(signature))
    public=key.public_key().public_bytes(serialization.Encoding.DER,serialization.PublicFormat.SubjectPublicKeyInfo)
    signer=lp(signed_data)+lp(signatures)+lp(public)
    v2value=lp(lp(signer))
    pair=struct.pack('<Q',4+len(v2value))+struct.pack('<I',SIG_ID)+v2value
    blocksize=len(pair)+24
    block=struct.pack('<Q',blocksize)+pair+struct.pack('<Q',blocksize)+APK_MAGIC
    footer=bytearray(eocd);struct.pack_into('<I',footer,16,cd+len(block))
    Path(signed).write_bytes(pre+block+directory+footer)
    return hashlib.sha256(certificate).hexdigest()

def read_lp(raw,pos=0):
    length=struct.unpack_from('<I',raw,pos)[0]
    return raw[pos+4:pos+4+length],pos+4+length

def verify_v2(path):
    data=Path(path).read_bytes();eocd=data.rfind(b'PK\x05\x06')
    cd=struct.unpack_from('<I',data,eocd+16)[0]
    if data[cd-16:cd]!=APK_MAGIC:raise ValueError('Missing APK v2 signature')
    size=struct.unpack_from('<Q',data,cd-24)[0]
    start=cd-size-8
    if struct.unpack_from('<Q',data,start)[0]!=size:raise ValueError('Bad signing block')
    pos=start+8;signers=None
    while pos<cd-24:
        n=struct.unpack_from('<Q',data,pos)[0];pos+=8
        typeid=struct.unpack_from('<I',data,pos)[0];pos+=4
        value=data[pos:pos+n-4];pos+=n-4
        if typeid==SIG_ID:signers=value
    if not signers:raise ValueError('v2 signer missing')
    signer_bytes,_=read_lp(signers);signer,_=read_lp(signer_bytes)
    signed_data,idx=read_lp(signer);signatures,idx=read_lp(signer,idx)
    sigrecord,_=read_lp(signatures);signature,_=read_lp(sigrecord,4)
    digests,idx=read_lp(signed_data);certificates,idx=read_lp(signed_data,idx)
    cert_der,_=read_lp(certificates)
    d,_=read_lp(digests);expected_digest,_=read_lp(d,4)
    cert=x509.load_der_x509_certificate(cert_der)
    cert.public_key().verify(signature,signed_data,padding.PKCS1v15(),hashes.SHA256())
    original_eocd=bytearray(data[eocd:]);struct.pack_into('<I',original_eocd,16,start)
    actual=digest_apk((data[:start],data[cd:eocd],original_eocd))
    if actual!=expected_digest:raise ValueError('APK digest mismatch')
    with zipfile.ZipFile(path) as z:
        if z.testzip():raise ValueError('APK corrupt')
    return hashlib.sha256(cert_der).hexdigest()

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--base',required=True);parser.add_argument('--output',required=True)
    parser.add_argument('--keystore',required=True);parser.add_argument('--password',default='android')
    parser.add_argument('--telemetry-url',default='');parser.add_argument('--telemetry-key',default='')
    args=parser.parse_args()
    if bool(args.telemetry_url)!=bool(args.telemetry_key):raise ValueError('Both telemetry URL and publishable key are required')
    if args.telemetry_url and not re.fullmatch(r'https://[a-z0-9-]+\.supabase\.co',args.telemetry_url):raise ValueError('Invalid Supabase URL')
    if args.telemetry_key and not re.fullmatch(r'sb_publishable_[A-Za-z0-9_-]+',args.telemetry_key):raise ValueError('Invalid public key')
    base=Path(args.base);out=Path(args.output)
    source=Path(__file__).with_name('admin_native_v057.js').read_text('utf-8')
    css=Path(__file__).with_name('admin_native_v057.css').read_text('utf-8')
    before=verify_v2(base)
    unsigned=out.with_suffix('.unsigned.apk')
    try:
        zip_align(base,unsigned,source,css,{'url':args.telemetry_url,'publishableKey':args.telemetry_key})
        signer=sign_v2(unsigned,out,args.keystore,args.password)
        final=verify_v2(out)
        if signer!=before or final!=before:raise ValueError('Signing certificate changed: APK cannot update the previous installation')
        with zipfile.ZipFile(out) as apk:
            script=apk.read(JS).decode('utf-8');styles=apk.read(CSS).decode('utf-8');manifest=apk.read(MANIFEST)
            for needle in ('SGAdminPanelV57','ABRIR ADMINISTRADOR',"screen==='admin'",'SmartGuard Family'):
                if needle not in script:raise ValueError('Missing expected feature: '+needle)
            if '.sga-panel' not in styles:raise ValueError('Admin CSS missing')
            if '0.5.7-piloto'.encode('utf-16-le') not in manifest:raise ValueError('Version 0.5.7 missing')
        print(json.dumps({'result':'PASS','signing_certificate_sha256':final,'version':'0.5.7-piloto',
            'version_code':14,'bytes':out.stat().st_size,'sha256':hashlib.sha256(out.read_bytes()).hexdigest(),
            'telemetry_backend_configured':bool(args.telemetry_url)},indent=2))
    finally:unsigned.unlink(missing_ok=True)
if __name__=='__main__':main()
