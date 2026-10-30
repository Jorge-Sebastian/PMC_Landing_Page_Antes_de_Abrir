#!/usr/bin/env python3
"""Re-sign a compiled native Android background telemetry upgrade over the 0.5.8 PILOT.

Requires the same PRIVATE original signing PKCS12 keystore, supplied outside git.
The v0.5.8 web experience is preserved and patched in-place; its existing Java
is replaced with a compiled native service (from a reviewed source-built APK).

Never commit private keys, passwords or users' Firebase tokens.
"""
from __future__ import annotations
import argparse, hashlib, io, json, struct, sys, zipfile
from pathlib import Path
from cryptography import x509
from cryptography.hazmat.primitives import hashes,serialization
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives.serialization import Encoding, PublicFormat, pkcs12
from patch_js_background_v059 import patch

MAGIC = b'APK Sig Block 42'
SIG_ID = 0x7109871A
RSA_SHA256 = 0x0103
CHUNK = 1048576
JS = 'assets/public/assets/index-DWhiuSDt.js'


def lengths(value: bytes): return struct.pack('<I',len(value))+value

def read_len(data, pos=0):
    size=struct.unpack_from('<I',data,pos)[0]
    return data[pos+4:pos+4+size], pos+4+size

def manifest_update(contents):
    b=bytearray(contents)
    pos=8
    while pos<len(b):
        typ,header,size=struct.unpack_from('<HHI',b,pos)
        if typ==1:
            cnt, styles, flags, strings_start, styles_start=struct.unpack_from('<IIIII',b,pos+8)
            if flags & 0x100: raise RuntimeError('Unexpected UTF8 manifest')
            values=[]
            for i in range(cnt):
                rel=struct.unpack_from('<I',b,pos+header+i*4)[0]
                start=pos+strings_start+rel
                length=struct.unpack_from('<H',b,start)[0]
                values.append(b[start+2:start+2+length*2].decode('utf-16-le'))
            break
        pos+=size
    else: raise RuntimeError('Manifest strings missing')
    old='0.5.8-piloto';new='0.5.9-piloto'
    if values.count(old)!=1: raise RuntimeError('Unexpected original app version')
    rel=struct.unpack_from('<I',b,pos+header+values.index(old)*4)[0]
    start=pos+strings_start+rel+2
    b[start:start+len(old.encode('utf-16-le'))]=new.encode('utf-16-le')
    cursor=8;changed=False
    while cursor<len(b):
        typ,header,size=struct.unpack_from('<HHI',b,cursor)
        if typ==0x102:
            ns,name,attrs,attr_len,count=struct.unpack_from('<IIHHH',b,cursor+16)
            if values[name]=='manifest':
                for i in range(count):
                    k=cursor+16+attrs+i*attr_len
                    n=struct.unpack_from('<I',b,k+4)[0]
                    if values[n]=='versionCode':
                        prev=struct.unpack_from('<I',b,k+16)[0]
                        if prev!=15: raise RuntimeError('Unexpected versionCode '+str(prev))
                        struct.pack_into('<I',b,k+16,16);changed=True
                break
        cursor+=size
    if not changed: raise RuntimeError('versionCode update missing')
    return bytes(b)


def write_entry(z,info,data):
    entry=zipfile.ZipInfo(info.filename,info.date_time)
    entry.compress_type=info.compress_type
    entry.create_system=info.create_system
    entry.external_attr=info.external_attr
    entry.internal_attr=info.internal_attr
    entry.flag_bits=info.flag_bits & ~0x8
    entry.comment=info.comment
    if entry.compress_type==zipfile.ZIP_STORED:
        alignment=4096 if info.filename.startswith('lib/') and info.filename.endswith('.so') else 4
        offset=z.fp.tell()+30+len(entry.filename.encode('utf-8'))
        pad=(alignment-(offset+4)%alignment)%alignment
        entry.extra=struct.pack('<HH',0xd935,pad)+b'\0'*pad
    z.writestr(entry,data,compress_type=entry.compress_type,compresslevel=6)


def repackage(base,compiled,output):
    with zipfile.ZipFile(base) as source,zipfile.ZipFile(compiled) as donor,zipfile.ZipFile(output,'w',allowZip64=False) as dest:
        dex={name:donor.read(name) for name in donor.namelist() if name.startswith('classes') and name.endswith('.dex')}
        base_dex={name for name in source.namelist() if name.startswith('classes') and name.endswith('.dex')}
        if not dex or dex.keys()!=base_dex: raise RuntimeError('Dex sets differ, do not overwrite: '+repr((sorted(dex),sorted(base_dex))))
        for info in source.infolist():
            raw=source.read(info.filename)
            if info.filename in dex: raw=dex[info.filename]
            if info.filename==JS: raw=patch(raw.decode('utf-8')).encode('utf-8')
            if info.filename=='AndroidManifest.xml':raw=manifest_update(raw)
            write_entry(dest,info,raw)
    with zipfile.ZipFile(output) as z:
        if z.testzip() is not None:raise RuntimeError('ZIP corruption')
        if b'firebaseBackgroundSession' not in b''.join(z.read(x) for x in dex):
            raise RuntimeError('Native telemetry bridge absent from the compiled dex')
    return sorted(dex)


def digest(parts):
    blocks=[]
    for part in parts:
        for i in range(0,len(part),CHUNK):
            chunk=part[i:i+CHUNK]
            blocks.append(hashlib.sha256(b'\xa5'+struct.pack('<I',len(chunk))+chunk).digest())
    return hashlib.sha256(b'\x5a'+struct.pack('<I',len(blocks))+b''.join(blocks)).digest()


def split_apk(data):
    end=data.rfind(b'PK\x05\x06')
    if end<0 or end+22!=len(data):raise RuntimeError('Unsupported APK EOCD')
    cd=struct.unpack_from('<I',data,end+16)[0]
    eocd=bytearray(data[end:]);struct.pack_into('<I',eocd,16,cd)
    return cd,data[:cd],data[cd:end],bytes(eocd)


def sign_v2(unsigned,destination,keyfile,password):
    private,cert,_=pkcs12.load_key_and_certificates(Path(keyfile).read_bytes(),password.encode())
    if private is None or cert is None: raise RuntimeError('Signing material unavailable')
    expected=hashlib.sha256(cert.public_bytes(Encoding.DER)).hexdigest()
    data=Path(unsigned).read_bytes()
    cd,prefix,directory,eocd=split_apk(data)
    hash_digest=digest([prefix,directory,eocd])
    signed_data=lengths(lengths(struct.pack('<I',RSA_SHA256)+lengths(hash_digest)))+lengths(lengths(cert.public_bytes(Encoding.DER)))+lengths(b'')
    signature=private.sign(signed_data,padding.PKCS1v15(),hashes.SHA256())
    public=private.public_key().public_bytes(Encoding.DER,PublicFormat.SubjectPublicKeyInfo)
    signer=lengths(signed_data)+lengths(lengths(struct.pack('<I',RSA_SHA256)+lengths(signature)))+lengths(public)
    value=lengths(lengths(signer))
    pair=struct.pack('<Q',4+len(value))+struct.pack('<I',SIG_ID)+value
    size=len(pair)+24
    block=struct.pack('<Q',size)+pair+struct.pack('<Q',size)+MAGIC
    updated=bytearray(eocd);struct.pack_into('<I',updated,16,cd+len(block))
    Path(destination).write_bytes(prefix+block+directory+updated)
    return expected


def extract_cert_and_verify(apk):
    data=Path(apk).read_bytes();end=data.rfind(b'PK\x05\x06');cd=struct.unpack_from('<I',data,end+16)[0]
    size=struct.unpack_from('<Q',data,cd-24)[0]
    if data[cd-16:cd]!=MAGIC:raise RuntimeError('Missing v2 sig')
    begin=cd-size-8
    pos=begin+8;signer=None
    while pos<cd-24:
        pair_size=struct.unpack_from('<Q',data,pos)[0];key=struct.unpack_from('<I',data,pos+8)[0]
        if key==SIG_ID:signer=data[pos+12:pos+8+pair_size]
        pos+=8+pair_size
    if signer is None:raise RuntimeError('Missing sig pair')
    signers,_=read_len(signer);s,_=read_len(signers)
    signed,offset=read_len(s);sig_blob,offset=read_len(s,offset)
    sig_record,_=read_len(sig_blob);sig,_=read_len(sig_record,4)
    hashes_blob,offset=read_len(signed);cert_blob,offset=read_len(signed,offset)
    cert_der,_=read_len(cert_blob)
    h_record,_=read_len(hashes_blob);stored,_=read_len(h_record,4)
    cert=x509.load_der_x509_certificate(cert_der)
    cert.public_key().verify(sig,signed,padding.PKCS1v15(),hashes.SHA256())
    corrected=bytearray(data[end:]);struct.pack_into('<I',corrected,16,begin)
    computed=digest([data[:begin],data[cd:end],corrected])
    if computed!=stored:raise RuntimeError('APK signature digest mismatch')
    return hashlib.sha256(cert_der).hexdigest()


def main():
    a=argparse.ArgumentParser()
    for key in ('base','compiled','keystore','output'):a.add_argument('--'+key,required=True)
    a.add_argument('--password',default='android');args=a.parse_args()
    base=Path(args.base); compiled=Path(args.compiled);output=Path(args.output)
    expected=extract_cert_and_verify(base)
    tmp=output.with_suffix('.unsigned.apk')
    try:
        dex=repackage(base,compiled,tmp)
        signing=sign_v2(tmp,output,args.keystore,args.password)
        verified=extract_cert_and_verify(output)
        if expected!=signing or expected!=verified:raise RuntimeError('Certificate changed: unsafe update')
        print(json.dumps({'version':'0.5.9-piloto','versionCode':16,'sha256':hashlib.sha256(output.read_bytes()).hexdigest(),
            'signerSHA256':verified,'dex':dex,'bytes':output.stat().st_size,'updateCompatible':True}))
    finally: tmp.unlink(missing_ok=True)

if __name__=='__main__':main()
