export async function reportPdf(node:HTMLElement,fileBase='TripLog'){
 await document.fonts.ready;
 const [{default:html2canvas},{jsPDF}]=await Promise.all([import('html2canvas-pro'),import('jspdf')]);
 const canvas=await html2canvas(node,{scale:2,backgroundColor:'#ffffff',windowWidth:node.scrollWidth});
 const pdf=new jsPDF({orientation:'landscape',unit:'mm',format:'a4'});
 const width=277,pageHeight=190,pixelsPerPage=pageHeight*canvas.width/width;
 for(let offset=0;offset<canvas.height;offset+=pixelsPerPage){
  if(offset>0)pdf.addPage();
  const slice=document.createElement('canvas');slice.width=canvas.width;slice.height=Math.min(pixelsPerPage,canvas.height-offset);
  const ctx=slice.getContext('2d');if(!ctx)throw new Error('PDF canvas unavailable');
  ctx.fillStyle='#ffffff';ctx.fillRect(0,0,slice.width,slice.height);
  ctx.drawImage(canvas,0,offset,canvas.width,slice.height,0,0,canvas.width,slice.height);
  pdf.addImage(slice.toDataURL('image/png'),'PNG',10,10,width,slice.height*width/canvas.width);
 }
 return new File([pdf.output('blob')],`${fileBase}-${new Date().toISOString().slice(0,10)}.pdf`,{type:'application/pdf'});
}
export function downloadFile(file:File){const url=URL.createObjectURL(file);const link=document.createElement('a');link.href=url;link.download=file.name;link.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}
