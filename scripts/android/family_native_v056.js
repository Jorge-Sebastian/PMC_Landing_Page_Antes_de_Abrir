/* SmartGuard Family v0.5.6: LOCAL DEMO only. No cross-device alert delivery. */
const SGFamilyLocalV56 = ({onBack,initialDomain}) => {
  const el = x.createElement;
  const createEmpty = () => ({name:'',members:[],invites:[],alerts:[]});
  const read = () => {
    try {
      const parsed = JSON.parse(localStorage.getItem('smartguard-family-local-v056') || 'null');
      return parsed && typeof parsed.name === 'string' && Array.isArray(parsed.members) && Array.isArray(parsed.invites) && Array.isArray(parsed.alerts) ? parsed : createEmpty();
    } catch { return createEmpty(); }
  };
  const [store,setStore] = x.useState(read);
  const [circleInput,setCircleInput] = x.useState('Mi familia');
  const [memberInput,setMemberInput] = x.useState('');
  const [relationInput,setRelationInput] = x.useState('Abuelo/a');
  const [riskInput,setRiskInput] = x.useState('red');
  const [domainInput,setDomainInput] = x.useState(initialDomain || '');
  const [memberForRisk,setMemberForRisk] = x.useState('');
  const [notice,setNotice] = x.useState('');
  const [tab,setTab] = x.useState('miembros');
  x.useEffect(() => { try { localStorage.setItem('smartguard-family-local-v056',JSON.stringify(store)); } catch {} },[store]);
  x.useEffect(() => { if(initialDomain) { setDomainInput(initialDomain); setTab('alertas'); } },[initialDomain]);
  const key = () => Date.now().toString(36) + Math.random().toString(36).slice(2,9);
  const change = fn => setStore(previous => fn(previous));
  const b = (label,onClick,kind='primary',disabled=false) => el('button',{type:'button',className:'sgf-button sgf-'+kind,onClick,disabled},label);
  const badge = (value,kind='normal') => el('span',{className:'sgf-badge sgf-'+kind},value);
  const field = (label,control) => el('label',{className:'sgf-field'},el('span',null,label),control);
  const input = (value,fn,placeholder,maxLength=72) => el('input',{type:'text',value,placeholder,maxLength,autoComplete:'off',onChange:e=>fn(e.target.value)});
  const section = (title,body) => el('div',{className:'sgf-card'},el('h2',null,title),body);
  const info = (message) => { setNotice(message); };
  const domainOnly = value => {
    const text = value.trim().toLowerCase();
    if (!text || text.length > 253) return '';
    try {
      const url = new URL(text.includes('://') ? text : 'https://' + text);
      const host = url.hostname.replace(/\.$/,'');
      if (!/^[a-z0-9.-]+$/.test(host) || !host.includes('.') || host.includes('..') || host.length > 253) return '';
      return host;
    } catch { return ''; }
  };
  const createCircle = () => {
    const name = circleInput.trim().slice(0,64);
    if(name.length < 2) return info('Escribe un nombre de al menos dos caracteres.');
    change(() => ({name,members:[],invites:[],alerts:[]}));
    info('Grupo de demostraci\u00f3n creado en este celular. Todav\u00eda no sincroniza con otros dispositivos.');
  };
  const loadDemo = () => {
    change(() => ({name:'Familia de demostraci\u00f3n',members:[
      {id:'demo-abuela',name:'Abuela',role:'Abuela/o',status:'accepted',consent:true},
      {id:'demo-mama',name:'Mam\u00e1',role:'Madre/padre',status:'accepted',consent:true},
      {id:'demo-tio',name:'T\u00edo',role:'T\u00edo/a',status:'pending',consent:false}],
      invites:[{id:'demo-invite',memberId:'demo-tio',code:'DEMO-INVITACION',status:'pending'}],alerts:[
        {id:'demo-risk',memberId:'demo-abuela',domain:'pago-inusual.example',level:'red',date:Date.now(),ack:false,kind:'demo'}]}));
    setTab('alertas');info('Datos ficticios cargados. Ning\u00fan familiar ha recibido una notificaci\u00f3n real.');
  };
  const addInvite = () => {
    const name = memberInput.trim().slice(0,60);
    if(name.length < 2) return info('Escribe el nombre del familiar.');
    if(store.members.length>=8) return info('Esta demostraci\u00f3n admite hasta ocho familiares.');
    const id = key();
    change(s=>({...s,members:[...s.members,{id,name,role:relationInput,status:'pending',consent:false}],invites:[...s.invites,{id:key(),memberId:id,code:'SGF-'+Math.random().toString(36).slice(2,9).toUpperCase(),status:'pending'}]}));
    setMemberInput('');info('Invitaci\u00f3n creada solo para esta prueba local; no se envi\u00f3 a ning\u00fan dispositivo.');
  };
  const accept = id => {
    change(s=>({...s,members:s.members.map(m=>m.id===id?{...m,status:'accepted'}:m),invites:s.invites.map(i=>i.memberId===id?{...i,status:'accepted'}:i)}));
    info('Aceptaci\u00f3n simulada. El familiar a\u00fan debe consentir las alertas.');
  };
  const consent = id => {
    change(s=>({...s,members:s.members.map(m=>m.id===id?{...m,consent:!m.consent}:m)}));
    info('Preferencia modificada para esta demostraci\u00f3n. En producci\u00f3n la autoriza cada integrante desde su cuenta.');
  };
  const sendRisk = () => {
    const domain = domainOnly(domainInput);
    const member = store.members.find(m=>m.id===memberForRisk && m.status==='accepted' && m.consent);
    if (!member) return info('Elige un integrante que haya aceptado y autorizado las alertas.');
    if (!domain) return info('Escribe un dominio p\u00fablico v\u00e1lido. Nunca pegues contrase\u00f1as ni enlaces privados.');
    change(s=>({...s,alerts:[{id:key(),memberId:member.id,domain,level:riskInput,date:Date.now(),ack:false,kind:'demo'},...s.alerts].slice(0,50)}));
    setTab('alertas');info('Alerta registrada en este celular. NO se envi\u00f3 a ning\u00fan familiar.');
  };
  const acknowledge = id => change(s=>({...s,alerts:s.alerts.map(a=>a.id===id?{...a,ack:true}:a)}));
  const removeCircle = () => {
    if (!window.confirm('Borrar los datos de prueba de SmartGuard Family en este celular?')) return;
    setStore(createEmpty());setNotice('Se borraron los datos locales de demostraci\u00f3n.');
  };
  const accepted = store.members.filter(m=>m.status==='accepted');
  const permitted = accepted.filter(m=>m.consent);
  const unresolved = store.alerts.filter(a=>!a.ack).length;
  const rowMember = m => el('div',{className:'sgf-member',key:m.id},
    el('span',{className:'sgf-avatar'},m.name[0]?.toUpperCase()||'?'),
    el('div',{className:'sgf-member-main'},el('strong',null,m.name),el('small',null,m.role),
      m.status==='pending'?badge('INVITACI\u00d3N PENDIENTE','pending'):m.consent?badge('ALERTAS AUTORIZADAS','ok'):badge('ALERTAS SIN AUTORIZAR','pending')),
    el('div',{className:'sgf-row-actions'},
      m.status==='pending'?b('Aceptar (prueba)',()=>accept(m.id),'outline'):b(m.consent?'Revocar (prueba)':'Autorizar (prueba)',()=>consent(m.id),'outline')));
  return el('section',{className:'sg-panel sgf-panel','aria-label':'SmartGuard Family'},
    el('div',{className:'sgf-top'},b('\u2190 PROTECCI\u00d3N',onBack,'subtle'),badge('ALPHA 0.2','ok')),
    el('div',{className:'sgf-title-line'},el('div',{className:'sgf-emblem'},'\u2661'),el('div',null,el('p',{className:'sgf-kicker'},'SMARTGUARD FAMILY'),el('h1',null,'Cuidamos a quienes m\u00e1s quieres.'))),
    el('p',{className:'sgf-description'},'Un espacio para organizar contactos de confianza y reaccionar juntos ante enlaces peligrosos.'),
    el('div',{className:'sgf-demo-banner',role:'status'},
      el('strong',null,'DEMOSTRACI\u00d3N LOCAL'),
      el('span',null,'Los grupos, invitaciones y alertas que crees se guardan solo en este celular. Por ahora no se env\u00edan avisos a otros familiares.')),
    notice?el('p',{className:'sgf-notice',role:'status'},notice):null,
    !store.name ? el('div',{className:'sgf-start'},
      section('Crea tu c\u00edrculo familiar',el('div',null,
        el('p',null,'Empieza con un grupo de prueba. Luego podr\u00e1s invitar familiares y autorizar contactos de confianza.'),
        field('NOMBRE DEL GRUPO',input(circleInput,setCircleInput,'Mi familia',64)),
        el('div',{className:'sgf-actions'},b('CREAR GRUPO DE PRUEBA',createCircle),b('VER DEMO FAMILIAR',loadDemo,'outline')))))
    :el('div',{className:'sgf-workspace'},
      el('div',{className:'sgf-family-header'},
        el('p',{className:'sgf-kicker'},'MI C\u00cdRCULO'),el('h2',null,store.name),
        el('p',null,'Solo este dispositivo \u2022 Sin sincronizaci\u00f3n entre miembros')),
      el('div',{className:'sgf-stats'},
        el('div',null,el('strong',null,String(store.members.length)),el('span',null,'INVITACIONES')),
        el('div',null,el('strong',null,String(permitted.length)),el('span',null,'CONTACTOS CON PERMISO')),
        el('div',null,el('strong',null,String(unresolved)),el('span',null,'ALERTAS DE PRUEBA'))),
      el('div',{className:'sgf-tabs',role:'tablist','aria-label':'Secciones familiares'},
        b('INTEGRANTES',()=>setTab('miembros'),tab==='miembros'?'active':'subtle'),
        b('ALERTAS',()=>setTab('alertas'),tab==='alertas'?'active':'subtle')),
      tab==='miembros'? el('div',null,
        section('Personas de confianza',store.members.length?
          el('div',{className:'sgf-member-list'},...store.members.map(rowMember)):
          el('p',null,'Todav\u00eda no hay familiares. Crea una invitaci\u00f3n de prueba.')),
        section('Invita a tu familia',el('div',null,
          el('p',null,'Las invitaciones son simuladas. Cada familiar deber\u00e1 aceptar y autorizar sus alertas cuando el servicio est\u00e9 conectado.'),
          field('NOMBRE',input(memberInput,setMemberInput,'Ejemplo: Abuelo, Mam\u00e1, Sof\u00eda',60)),
          field('PARENTESCO',el('select',{value:relationInput,onChange:e=>setRelationInput(e.target.value)},
            ...['Abuelo/a','Madre/padre','Hijo/a','T\u00edo/a','Hermano/a','Otro'].map(r=>el('option',{key:r,value:r},r)))),
          b('CREAR INVITACI\u00d3N DE PRUEBA',addInvite),
          store.invites.some(i=>i.status==='pending')?el('div',{className:'sgf-invite-list'},
            ...store.invites.filter(i=>i.status==='pending').map(i=>el('p',{key:i.id},'C\u00d3DIGO DE PRUEBA: ',el('strong',null,i.code)))):null)))
      :el('div',null,
        section('Pide ayuda de forma responsable',el('div',null,
          el('p',null,'Registra una alerta de prueba para practicar c\u00f3mo reaccionar\u00edan tus contactos. No se enviar\u00e1 ninguna notificaci\u00f3n externa.'),
          field('INTEGRANTE QUE NECESITA AYUDA',el('select',{value:memberForRisk,onChange:e=>setMemberForRisk(e.target.value)},
            el('option',{value:''},'Selecciona un familiar'),...permitted.map(m=>el('option',{value:m.id,key:m.id},m.name)))),
          field('DOMINIO OBSERVADO',input(domainInput,setDomainInput,'ejemplo-sospechoso.com',253)),
          field('NIVEL DE ADVERTENCIA',el('select',{value:riskInput,onChange:e=>setRiskInput(e.target.value)},
            el('option',{value:'red'},'ROJO \u00b7 RIESGO'),el('option',{value:'orange'},'NARANJA \u00b7 PRECAUCI\u00d3N'))),
          b('CREAR ALERTA DE PRUEBA',sendRisk,'danger'))),
        section('Historial de pruebas',store.alerts.length?
          el('div',{className:'sgf-alerts'},...store.alerts.map(a=>{
            const person=store.members.find(m=>m.id===a.memberId);
            return el('div',{className:'sgf-alert',key:a.id},
              el('span',{className:'sgf-alert-dot '+(a.level==='red'?'sgf-alert-red':'sgf-alert-orange')},'!'),
              el('div',{className:'sgf-alert-copy'},el('strong',null,(person?.name||'Familiar')+' necesita ayuda'),
                el('p',null,'Dominio de prueba: ',el('code',null,a.domain)),
                el('small',null,new Date(a.date).toLocaleString('es-CO'), ' \u00b7 ',a.ack?'Revisada':'Pendiente'),
                a.ack?null:b('MARCAR REVISADA',()=>acknowledge(a.id),'outline')));
          })):
          el('p',null,'Todav\u00eda no has creado alertas de prueba.'))),
      el('div',{className:'sgf-bottom'},b('BORRAR DATOS DE PRUEBA',removeCircle,'subtle'))),
    el('p',{className:'sgf-privacy'},'PRIVACIDAD: No se leen conversaciones familiares ni se comparte el texto de los mensajes. Este m\u00f3dulo no detecta aperturas externas de enlaces.'));
};