#!/usr/bin/env python3
"""Patch the supplied SmartGuard 0.5.4 pilot APK without changing its native features.

This is a transitional patch for APK-only v0.5.4, not a replacement for its
missing original source. The input keystore is private and never included in
an output or repository commit. Requires: pip install cryptography
"""
import argparse
import hashlib
import io
import os
import re
import struct
import zipfile
from pathlib import Path
from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives.serialization import pkcs12

APK_MAGIC = b'APK Sig Block 42'
SIG_ID = 0x7109871a
RSA_SHA256 = 0x0103
ONE_MB = 1024 * 1024


def one_replace(text, original, replacement):
    count = text.count(original)
    if count != 1:
        raise ValueError(f'Expected exactly one occurrence; got {count}: {original[:88]!r}')
    return text.replace(original, replacement, 1)


def replace_line_containing(text, key, replacement):
    lines = text.splitlines(keepends=True)
    indexes = [i for i, line in enumerate(lines) if key in line]
    if len(indexes) != 1:
        raise ValueError(f'Expected exactly one line containing {key!r}, got {len(indexes)}')
    original = lines[indexes[0]]
    newline = '\n' if original.endswith('\n') else ''
    lines[indexes[0]] = replacement + newline
    return ''.join(lines)


def patch_js(script):
    anchor = '/* SmartGuard 0.5.2 - native APK onboarding; lives inside the existing Clerk React tree. */'
    if script.count(anchor) != 1:
        raise ValueError('Unsupported APK: SmartGuard v0.5.4 onboarding anchor is missing')
    script = one_replace(
        script,
        "const storageKey = userId ? 'smartguard-native-onboard-v054:' + userId : '';",
        "const storageKey = 'smartguard-native-onboard-v054:device';",
    )
    script = one_replace(
        script,
        "const getSave = () => { try { return localStorage.getItem(storageKey) === 'done'; } catch { return false; } };",
        "const getSave = () => { try { if (localStorage.getItem(storageKey) === 'done') return true; "
        "if (userId && localStorage.getItem('smartguard-native-onboard-v054:' + userId) === 'done') "
        "{ localStorage.setItem(storageKey, 'done'); return true; } return false; } catch { return false; } };",
    )
    script = one_replace(script,
        "    if (!isLoaded) { setScreen('loading'); return; }\n    if (!userId) { setScreen('login'); setPermissionState(null); return; }\n",
        "    // Android protection is available to guests; Clerk is only for optional accounts.\n")
    script = one_replace(script, "  }, [isLoaded, userId]);", "  }, [userId]);")
    script = one_replace(script,
        "    if (!userId || !['permissions','success','dashboard'].includes(screen)) return;",
        "    if (!['permissions','success','dashboard'].includes(screen)) return;")
    script = one_replace(script, "  }, [userId, screen, getStatus]);", "  }, [screen, getStatus]);")
    script = one_replace(script, "if (!isLoaded || screen==='loading')", "if (screen==='loading')")
    script = one_replace(script, "else if (!userId || screen==='login')", "else if (screen==='login')")
    script = replace_line_containing(script, "chip('PASO 1 DE 3", "      chip('CUENTA OPCIONAL'),")
    script = replace_line_containing(script, "el('h1',null,'Tu protecci", "      el('h1',null,'Vincula tu cuenta cuando quieras.'),")
    script = replace_line_containing(script, "'Inicia sesi", "      el('p',{className:'sg-lead'},'La protecci\u00f3n funciona sin registrarte. Inicia sesi\u00f3n solo para utilizar funciones vinculadas a tu cuenta.'),")
    script = replace_line_containing(script, "'Autenticaci", "      el('p',{className:'sg-small'},'Tu cuenta es opcional. SmartGuard protege los enlaces visibles sin iniciar sesi\u00f3n.'),")
    script = one_replace(script,
        "      el('div',{className:'sg-line'}),\n      el('div',{className:'sg-three-icons'}",
        "      el('div',{className:'sg-actionbar'},btn('Continuar sin cuenta',()=>{setError('');setScreen(getSave()?'dashboard':'presentation');},'secondary')),\n      el('div',{className:'sg-line'}),\n      el('div',{className:'sg-three-icons'}")
    script = replace_line_containing(script, "chip('PASO 3 DE 3", "      chip('PASO 2 DE 2 \u00b7 CONFIGURACI\u00d3N'),")
    script = one_replace(script,
        "el('div',{className:'sg-bottom-user'},el('span',null,'Sesi\u00f3n iniciada'),k.jsx(y4,{}))",
        "el('div',{className:'sg-bottom-user'},userId?el('span',null,'Sesi\u00f3n iniciada'):el('span',null,'PROTECCI\u00d3N SIN CUENTA'),userId?k.jsx(y4,{}):btn('Iniciar sesi\u00f3n (opcional)',()=>setScreen('login'),'secondary'))")
    script = one_replace(script,
        'SmartGuard solicita una cuenta para configurar la protecci\u00f3n en Android.',
        'La protecci\u00f3n en Android funciona sin iniciar sesi\u00f3n; una cuenta es opcional.')
    script = one_replace(script,
        "el('p',null,'Conectando con el inicio de sesi\u00f3n\u2026'),",
        "el('p',null,'Preparando el motor local de protecci\u00f3n\u2026'),")
    script = one_replace(script,
        "el('p',{className:'sg-small'},'Se necesita una conexi\u00f3n a Internet para iniciar sesi\u00f3n por primera vez.'));",
        "el('p',{className:'sg-small'},'No necesitas una cuenta para proteger tu celular.'));")
    return script


def update_manifest(contents):
    b=bytearray(contents)
    pos=8
    while pos<len(b):
        typ,header,size=struct.unpack_from('<HHI',b,pos)
        if typ==1:
            count,styles,flags,string_start,style_start=struct.unpack_from('<IIIII',b,pos+8)
            if flags & 0x100: raise ValueError('Unexpected UTF8 manifest strings')
            strings=[]
            for idx in range(count):
                delta=struct.unpack_from('<I',b,pos+header+idx*4)[0]
                at=pos+string_start+delta
                length=struct.unpack_from('<H',b,at)[0]
                strings.append(b[at+2:at+2+2*length].decode('utf-16-le'))
            break
        pos+=size
    else: raise ValueError('Missing binary manifest string pool')
    # Change only the in-pool version label, preserving its exact UTF16 length.
    version_idx=strings.index('0.5.4-piloto')
    offset=struct.unpack_from('<I',b,pos+header+version_idx*4)[0]
    at=pos+string_start+offset+2
    b[at:at+len('0.5.4-piloto'.encode('utf-16-le'))]='0.5.5-piloto'.encode('utf-16-le')
    current=8
    patched_code=False
    while current<len(b):
        typ,header,size=struct.unpack_from('<HHI',b,current)
        if typ==0x102:
            ns,name,attr_start,attr_size,attr_count=struct.unpack_from('<IIHHH',b,current+16)
            if strings[name]=='manifest':
                for i in range(attr_count):
                    a=current+16+attr_start+i*attr_size
                    attr_name=struct.unpack_from('<I',b,a+4)[0]
                    if strings[attr_name]=='versionCode':
                        prev=struct.unpack_from('<I',b,a+16)[0]
                        if prev!=11:raise ValueError(f'Expected versionCode 11, found {prev}')
                        struct.pack_into('<I',b,a+16,12)
                        patched_code=True
                break
        current+=size
    if not patched_code:raise ValueError('Failed to bump Android versionCode')
    return bytes(b)


def zip_align(original_zip, patch_js_asset, output):
    with zipfile.ZipFile(original_zip,'r') as src, zipfile.ZipFile(output,'w',allowZip64=False) as dst:
        for info in src.infolist():
            raw=src.read(info.filename)
            if info.filename==patch_js_asset:
                raw=patch_js(raw.decode('utf-8')).encode('utf-8')
            elif info.filename=='AndroidManifest.xml':
                raw=update_manifest(raw)
            z=zipfile.ZipInfo(info.filename,info.date_time)
            z.compress_type=info.compress_type
            z.create_system=info.create_system
            z.external_attr=info.external_attr
            z.internal_attr=info.internal_attr
            z.flag_bits=info.flag_bits & ~0x0008
            z.comment=info.comment
            # All uncompressed data align to 4 bytes; shared native libraries
            # (if ever present) align to a full 4096-byte page.
            if z.compress_type==zipfile.ZIP_STORED:
                alignment=4096 if info.filename.startswith('lib/') and info.filename.endswith('.so') else 4
                offset=dst.fp.tell()+30+len(z.filename.encode('utf-8'))
                padding=(alignment-(offset+4)%alignment)%alignment
                z.extra=struct.pack('<HH',0xd935,padding)+b'\x00'*padding
            dst.writestr(z,raw,compress_type=z.compress_type,compresslevel=6)
    return output


def lp(value):return struct.pack('<I',len(value))+value


def split_unsigned_apk(data):
    eocd=data.rfind(b'PK\x05\x06')
    if eocd<0:raise ValueError('No APK EOCD found')
    if eocd+22!=len(data):raise ValueError('Unsupported trailing APK zip comment')
    directory=struct.unpack_from('<I',data,eocd+16)[0]
    eocd_bytes=bytearray(data[eocd:]);struct.pack_into('<I',eocd_bytes,16,directory)
    return directory,data[:directory],data[directory:eocd],bytes(eocd_bytes)


def digest_apk(section1,section2,eocd):
    buffers=(section1,section2,eocd)
    blocks=[]
    for part in buffers:
        for off in range(0,len(part),ONE_MB):
            chunk=part[off:off+ONE_MB]
            blocks.append(hashlib.sha256(b'\xa5'+struct.pack('<I',len(chunk))+chunk).digest())
    return hashlib.sha256(b'\x5a'+struct.pack('<I',len(blocks))+b''.join(blocks)).digest()


def sign_v2(unsigned_file, signed_file, keystore_file, password):
    key,cert,_=pkcs12.load_key_and_certificates(Path(keystore_file).read_bytes(),password.encode('utf-8'))
    if key is None or cert is None: raise ValueError('Private signing identity unavailable')
    from cryptography.hazmat.primitives.serialization import Encoding,PublicFormat
    data=Path(unsigned_file).read_bytes()
    cd,pre,directory,eocd=split_unsigned_apk(data)
    digest=digest_apk(pre,directory,eocd)
    cert_der=cert.public_bytes(Encoding.DER)
    signed_data=lp(lp(struct.pack('<I',RSA_SHA256)+lp(digest)))+lp(lp(cert_der))+lp(b'')
    signature=key.sign(signed_data,padding.PKCS1v15(),hashes.SHA256())
    signatures=lp(struct.pack('<I',RSA_SHA256)+lp(signature))
    pub=key.public_key().public_bytes(Encoding.DER,PublicFormat.SubjectPublicKeyInfo)
    signer=lp(signed_data)+lp(signatures)+lp(pub)
    v2_value=lp(lp(signer))
    pair=struct.pack('<Q',4+len(v2_value))+struct.pack('<I',SIG_ID)+v2_value
    block_size=len(pair)+24
    block=struct.pack('<Q',block_size)+pair+struct.pack('<Q',block_size)+APK_MAGIC
    eocd_signed=bytearray(eocd)
    struct.pack_into('<I',eocd_signed,16,cd+len(block))
    Path(signed_file).write_bytes(pre+block+directory+eocd_signed)
    return hashlib.sha256(cert_der).hexdigest()


def verify(apk,expected_sha=None):
    b=Path(apk).read_bytes()
    cd_offset=struct.unpack_from('<I',b,b.rfind(b'PK\x05\x06')+16)[0]
    block_size=struct.unpack_from('<Q',b,cd_offset-24)[0]
    if b[cd_offset-16:cd_offset]!=APK_MAGIC:raise ValueError('APK signing block not found')
    block_start=cd_offset-block_size-8
    if struct.unpack_from('<Q',b,block_start)[0]!=block_size:raise ValueError('Signature size mismatch')
    p=block_start+8;found=None
    while p<cd_offset-24:
        size=struct.unpack_from('<Q',b,p)[0];p+=8
        alg=struct.unpack_from('<I',b,p)[0];p+=4
        payload=b[p:p+size-4];p+=size-4
        if alg==SIG_ID:found=payload
    if found is None:raise ValueError('Missing signature scheme v2')
    def read_lp(data,pos=0):
        length=struct.unpack_from('<I',data,pos)[0]
        return data[pos+4:pos+4+length],pos+4+length
    signers,_=read_lp(found);signer,_=read_lp(signers)
    signed_data,idx=read_lp(signer);sigs,idx=read_lp(signer,idx);public_key_bytes,idx=read_lp(signer,idx)
    sigrecord,_=read_lp(sigs)
    alg=struct.unpack_from('<I',sigrecord,0)[0]
    if alg!=RSA_SHA256:raise ValueError('Unexpected signature algorithm')
    signature,_=read_lp(sigrecord,4)
    digest_records,idx=read_lp(signed_data)
    certificates,idx=read_lp(signed_data,idx)
    cert_der,_=read_lp(certificates)
    rec,_=read_lp(digest_records)
    alg=struct.unpack_from('<I',rec,0)[0];actual_digest,_=read_lp(rec,4)
    certificate=x509.load_der_x509_certificate(cert_der)
    certificate.public_key().verify(signature,signed_data,padding.PKCS1v15(),hashes.SHA256())
    sha=hashlib.sha256(cert_der).hexdigest()
    if expected_sha and sha!=expected_sha:raise ValueError('Signature differs from input APK')
    eocd_offset=b.rfind(b'PK\x05\x06');eocd=bytearray(b[eocd_offset:]);struct.pack_into('<I',eocd,16,block_start)
    recomputed=digest_apk(b[:block_start],b[cd_offset:eocd_offset],eocd)
    if recomputed!=actual_digest:raise ValueError('Signature digest mismatch')
    with zipfile.ZipFile(apk) as z:
        bad=z.testzip()
        if bad:raise ValueError('ZIP CRC failed: '+bad)
        assert b'Continuar sin cuenta' in z.read('assets/public/assets/index-DWhiuSDt.js')
        assert '0.5.5-piloto'.encode('utf-16-le') in z.read('AndroidManifest.xml')
    return {'signed_by':sha,'sha256':hashlib.sha256(b).hexdigest(),'size':len(b)}


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--base',required=True)
    parser.add_argument('--keystore',required=True)
    parser.add_argument('--password',default='android')
    parser.add_argument('--output',required=True)
    args=parser.parse_args()
    with zipfile.ZipFile(args.base) as z:
        index=z.read('assets/public/index.html').decode('utf-8')
    js_file=re.search(r'(/assets/index-DWhiuSDt\.js)',index)
    if not js_file:raise ValueError('The base APK is not the verified v0.5.4 build')
    temp=Path(args.output).with_suffix('.unsigned.apk')
    try:
        zip_align(args.base,'assets/public'+js_file.group(1),str(temp))
        digest=sign_v2(temp,args.output,args.keystore,args.password)
        proof=verify(args.output,digest)
        print('Signed updated APK',proof)
    finally:
        temp.unlink(missing_ok=True)

if __name__=='__main__':main()