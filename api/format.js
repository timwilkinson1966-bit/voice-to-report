export default async function handler(req,res){
  if(req.method!=='POST') return res.status(405).json({error:'Method not allowed'});
  try{
    const {text,documentType,title}=req.body||{};
    if(typeof text!=='string'||!text.trim()) return res.status(400).json({error:'Missing text'});
    if(text.length>12000) return res.status(413).json({error:'Report too long'});
    const prompt=[
      'Rewrite the dictated text into a polished professional document.',
      'Preserve every factual detail. Do not invent, infer, add names, dates, times, causes, outcomes or actions that were not stated.',
      'Correct grammar, punctuation, sentence structure and obvious speech-to-text errors when the intended meaning is clear.',
      'Remove filler words, false starts and unnecessary repetition.',
      'Keep the tone clear, natural and professional, not over-formal.',
      'Return only the finished document text with no commentary.',
      'Document type: '+(documentType||'General Report')+'.',
      title ? 'Preferred title: '+title+'.' : '',
      'Dictated text follows:',
      text.trim()
    ].filter(Boolean).join('\n');
    const r=await fetch('https://api.openai.com/v1/responses',{
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+process.env.OPENAI_API_KEY},
      body:JSON.stringify({model:'gpt-5.6-luna',input:prompt,reasoning:{effort:'none'}})
    });
    const data=await r.json();
    if(!r.ok) return res.status(502).json({error:'AI service error'});
    let out='';
    if(Array.isArray(data.output)){
      for(const item of data.output){
        if(Array.isArray(item.content)){
          for(const part of item.content){
            if(part && typeof part.text==='string') out+=part.text;
          }
        }
      }
    }
    if(!out.trim()) return res.status(502).json({error:'No formatted report returned'});
    res.setHeader('Cache-Control','no-store');
    return res.status(200).json({report:out.trim()});
  }catch(e){
    return res.status(500).json({error:'Formatting failed'});
  }
}