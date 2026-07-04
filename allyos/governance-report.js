/* AllyOS Governance Binder Report — client-side PDF (pdfmake), PHI-free.
 * Full I–VIII monthly binder matching the RenuviaMD/Ally ReportLab template. Lazy-loads pdfmake.
 *
 *   AllyOSGovReport.download(payload)
 *   payload = { clinic, program, md, mdLicense, reportDate, rec, overall, verifyDate,
 *               practitioners:[[name,position,license,expires]], scopeNote, protocolStatus,
 *               adverse, adverseNote, bioVendor, bioSince, charts:[[chart,dos,type]],
 *               lines:[{title,items:[{label,status}]}], corrections:[{label,resp,due}], note }
 */
window.AllyOSGovReport = (function () {
  var NAVY = '#13233b', GREEN = '#1f8f55', RED = '#b42318', BLUE = '#2f66d8',
      GOLD = '#b87913', SLATE = '#475569', LIGHT = '#f6f8fb', LINE = '#d9e1ec', INK = '#1f2937', HEAD = '#eef4ff';
  function loadScript(src){return new Promise(function(res,rej){var s=document.createElement('script');s.src=src;s.onload=res;s.onerror=function(){rej(new Error('failed to load '+src));};(document.head||document.documentElement).appendChild(s);});}
  function ensure(){return new Promise(function(resolve,reject){if(window.pdfMake&&window.pdfMake.vfs)return resolve(window.pdfMake);loadScript('vendor/pdfmake.min.js').then(function(){return loadScript('vendor/vfs_fonts.js');}).then(function(){window.pdfMake?resolve(window.pdfMake):reject(new Error('pdfmake not available'));}).catch(reject);});}
  function statusColor(s){return s==='Present'?GREEN:s==='Missing'?RED:s==='Not applicable'?BLUE:s==='Yes'?GREEN:s==='NOT ACTIVE'?GOLD:GREEN;}
  function gridLayout(){return {hLineColor:function(){return LINE;},vLineColor:function(){return LINE;},hLineWidth:function(){return 0.5;},vLineWidth:function(){return 0.5;},paddingTop:function(){return 5;},paddingBottom:function(){return 5;},paddingLeft:function(){return 6;},paddingRight:function(){return 6;}};}
  function sec(t){return {text:t,style:'sectionTitle'};}
  function bodyP(t){return {text:t,style:'body',margin:[0,2,0,6]};}
  function statusBox(label,status,color){
    return {table:{widths:['*',120],body:[[{text:label,bold:true,color:SLATE,fontSize:8.5},{text:status,bold:true,color:color||GREEN,alignment:'center',fontSize:8.5}]]},
      layout:{fillColor:function(){return LIGHT;},hLineColor:function(){return LINE;},vLineColor:function(){return LINE;},hLineWidth:function(){return 0.75;},vLineWidth:function(){return 0.35;},paddingTop:function(){return 6;},paddingBottom:function(){return 6;},paddingLeft:function(){return 8;},paddingRight:function(){return 8;}},margin:[0,4,0,6]};
  }
  function checklist(title,items){
    var body=[[{text:title,bold:true,color:SLATE,fontSize:8.5,fillColor:HEAD},{text:'Status',bold:true,color:SLATE,fontSize:8.5,alignment:'right',fillColor:HEAD}]];
    items.forEach(function(it){body.push([{text:it.label,fontSize:9.5,color:INK},{text:it.status||'—',bold:true,alignment:'right',color:statusColor(it.status),fontSize:8.5}]);});
    return {table:{widths:['*',92],body:body},layout:gridLayout(),margin:[0,2,0,8],unbreakable:true};
  }
  function dataTable(head,rows,widths){
    var body=[head.map(function(h){return {text:h,bold:true,color:'white',fontSize:8.5,fillColor:NAVY};})];
    rows.forEach(function(r){body.push(r.map(function(c){return {text:''+(c==null?'':c),fontSize:9,color:INK};}));});
    return {table:{widths:widths||null,headerRows:1,body:body},layout:gridLayout(),margin:[0,2,0,8]};
  }

  function build(pl){
    var overallColor=pl.overall==='Compliant'?GREEN:pl.overall==='Needs correction'?RED:SLATE;
    var pracRows=(pl.practitioners&&pl.practitioners.length?pl.practitioners:[['Armando A. Falcon','Medical Director','FL Medical License · ME 84789','Verify']])
      .map(function(r,i){return [String(i+1)].concat([r[0]||'—',r[1]||'—',r[2]||'—',r[3]||'—']);});
    // charts may be objects {ref,ini,dos,line,status} (chart-review engine) or legacy [chart,dos,type].
    var chartsSrc=(pl.charts&&pl.charts.length)?pl.charts:[{ref:'{chart 1}',dos:'{DOS}',line:'{review type}',status:'Reviewed'},{ref:'{chart 2}',dos:'{DOS}',line:'{review type}',status:'Reviewed'},{ref:'{chart 3}',dos:'{DOS}',line:'{review type}',status:'Reviewed'},{ref:'{chart 4}',dos:'{DOS}',line:'{review type}',status:'Reviewed'},{ref:'{chart 5}',dos:'{DOS}',line:'{review type}',status:'Reviewed'}];
    var chartRows=chartsSrc.map(function(r,i){
      var o=Array.isArray(r)?{ref:r[0],ini:'',dos:r[1],line:r[2],status:'Reviewed'}:r;
      return [String(i+1),o.ref||'—',o.ini||'—',o.dos||'—',o.line||'—',o.status||'Reviewed'];
    });
    var content=[
      {text:(pl.clinic||'Clinic')+(pl.program?(' · '+pl.program):''),style:'clinicName'},
      pl.address?{text:pl.address,style:'clinicAddr'}:{text:'',margin:[0,0]},
      {canvas:[{type:'line',x1:0,y1:0,x2:512,y2:0,lineWidth:1,lineColor:NAVY}],margin:[0,6,0,8]},
      {text:'Monthly Medical Director Governance Binder Report',style:'coverTitle'},
      {text:' ',margin:[0,4]},
      dataTable(['Field','Detail'],[
        ['Clinic / Program',(pl.clinic||'—')+(pl.program?(' / '+pl.program):'')],
        ['Medical Director',(pl.md||'—')+(pl.mdLicense?(' · '+pl.mdLicense):'')],
        ['Report Date',pl.reportDate||'—'],
        ['Clinic Record Location',pl.rec||'Clinic EMR / paper chart remains the official record'],
        ['Active Treatment Lines',(pl.lines&&pl.lines.length)?pl.lines.map(function(l){return l.title;}).join(', '):'None active for this period'],
        ['Overall Status',pl.overall||'—']
      ],[140,'*']),
      sec('I. Active / Unencumbered License'),
      statusBox('All practitioners verified active and unencumbered via Florida DOH on '+(pl.verifyDate||'{verification date}')+'.','COMPLIANT',GREEN),
      dataTable(['#','Name','Position','License Type','Expires'],pracRows,[22,'*','*','*',70]),
      sec('II. Scope of Practice / Supervision'),
      statusBox('All practitioners hold active appropriate certification/licensure for level of care provided.','COMPLIANT',GREEN),
      bodyP(pl.scopeNote||'Practitioner scope reviewed against assigned role and clinic protocol. A practitioner may perform only the services authorized by license, training, and signed protocol.'),
      statusBox('Physician protocol status',pl.protocolStatus||'ACTIVE / COMPLIANT',GREEN),
      sec('III. Adverse Incidents'),
      statusBox('Unreported adverse incidents for this period',pl.adverse||'NONE REPORTED',(pl.adverse&&pl.adverse!=='NONE REPORTED')?GOLD:GREEN),
      bodyP('Reported adverse incidents during this period: '+(pl.adverseNote||'none reported unless separately attached in the clinic incident log.')+' Any adverse event, urgent referral, EMS/911 call, medication reaction, protocol deviation, or patient complaint must be escalated and filed in the clinic record.'),
      sec('IV. Biohazardous Waste Plan'),
      statusBox('Biohazardous waste plan on file; staff trained.','COMPLIANT',GREEN),
      bodyP('Biohazard vendor: '+(pl.bioVendor||'{Vendor name}')+'. Vendor active since '+(pl.bioSince||'{date}')+'. Clinic maintains vendor documentation and staff training record in the clinic binder.'),
      sec('V. Clinical Record Review / Monthly Governance Audit'),
      bodyP('Charts were randomly sampled from the clinic’s monthly encounter list and reviewed against the service-line documentation parameters. No PHI is published in this binder copy — chart reference + patient initials only.'),
      dataTable(['#','Chart ref','Initials','Date of service','Line','Result'],chartRows,[20,'*',48,72,'*',52]),
      sec('VI. Service-Line Governance Review'),
      bodyP('Only active treatment lines are shown below. Inactive service lines are omitted from this report.')
    ];
    if(pl.lines&&pl.lines.length) pl.lines.forEach(function(l){content.push(checklist(l.title,l.items));});
    else content.push(statusBox('No IV/IM, peptide, or BHRT/HRT line was active this period','NOT ACTIVE',GOLD));
    content.push(sec('VII. Corrective Action & Compliance Education'));
    if(pl.corrections&&pl.corrections.length){
      content.push(bodyP('The following items were marked Missing and require correction:'));
      content.push(dataTable(['Item','Responsible party','Due date'],pl.corrections.map(function(c){return [c.label+' missing',c.resp||'—',c.due||'—'];}),['*',150,100]));
    } else {
      content.push(statusBox('Corrective action','NONE REQUIRED',GREEN));
    }
    if(pl.priorCorrections&&pl.priorCorrections.length){
      content.push(bodyP('Status of prior-period corrective items:'));
      content.push(dataTable(['Prior item','Status'],pl.priorCorrections.map(function(c){return [c.label,c.status||'Pending'];}),['*',100]));
    }
    content.push(bodyP('Compliance education: staff reminded that services may only be performed within signed protocol, active license/scope, documented consent, and clinic record requirements. The clinic EMR or paper chart remains the official medical record.'));
    content.push(sec('VIII. Medical Director Attestation'));
    content.push(bodyP(pl.note||'I reviewed the governance items above for the reporting period. This report documents Medical Director oversight status, practitioner/license review, service-line governance, clinical record review, and any corrective-action needs for the clinic binder.'));
    content.push({text:' ',margin:[0,18]});
    content.push({columns:[
      {width:'*',stack:[{canvas:[{type:'line',x1:0,y1:0,x2:250,y2:0,lineWidth:0.75}]},{text:(pl.md||'Medical Director')+' — Signature & Print',color:SLATE,fontSize:9,margin:[0,4,0,0]}]},
      {width:150,stack:[{canvas:[{type:'line',x1:0,y1:0,x2:130,y2:0,lineWidth:0.75}]},{text:'Date',color:SLATE,fontSize:9,margin:[0,4,0,0]}]}
    ]});
    return {
      pageSize:'LETTER',pageMargins:[50,46,50,54],
      info:{title:'Ally Monthly Governance Binder Report',author:pl.md||'Medical Director'},
      footer:function(cp,pc){return {margin:[50,8,50,0],columns:[{text:'Ally AuditPro · powered by RenuviaMD Compliance Division',color:SLATE,fontSize:7.5},{text:'Page '+cp+' of '+pc,color:SLATE,fontSize:7.5,alignment:'right'}]};},
      content:content,
      styles:{clinicName:{fontSize:15,bold:true,color:NAVY,alignment:'center'},clinicAddr:{fontSize:9.5,color:SLATE,alignment:'center',margin:[0,2,0,0]},coverTitle:{fontSize:17,bold:true,color:NAVY,alignment:'center',margin:[0,0,0,4]},subtitle:{fontSize:10,color:SLATE,alignment:'center'},sectionTitle:{fontSize:13,bold:true,color:NAVY,margin:[0,14,0,6]},body:{fontSize:9.5,color:INK,lineHeight:1.25}},
      defaultStyle:{fontSize:9.5,color:INK}
    };
  }
  function download(pl){return ensure().then(function(pm){var name='Ally-Governance-'+(pl.clinic||'Clinic').replace(/[^A-Za-z0-9]+/g,'-')+'-'+(pl.reportDate||'').replace(/[^A-Za-z0-9]+/g,'-')+'.pdf';pm.createPdf(build(pl)).download(name);});}
  return {build:build,download:download,ensure:ensure};
})();
