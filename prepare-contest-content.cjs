const fs=require('fs'),path=require('path'),crypto=require('crypto');
const XLSX=require('xlsx');
const root=process.argv[2]||'C:/Users/NACETEM060/Desktop/PSR';
const old=JSON.parse(fs.readFileSync('src/data/excelQuestions.json','utf8'));
const quote=v=>v==null?'NULL':"'"+String(v).replaceAll("'","''")+"'";
const uuid=id=>{const h=crypto.createHash('md5').update('psr:'+id).digest('hex');return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;};
const norm=s=>String(s??'').trim().replace(/\s+/g,' ');
const rows=[],issues=[],sql=['BEGIN;'];
for(const file of fs.readdirSync(root).filter(f=>f.endsWith('.xlsx')).sort()){
 const book=XLSX.readFile(path.join(root,file));
 for(const sheet of book.SheetNames) for(const [i,r] of XLSX.utils.sheet_to_json(book.Sheets[sheet]).entries()){
  const options=['A','B','C','D'].map(x=>norm(r['Option '+x]));
  const index='ABCD'.indexOf(norm(r['Correct Option']).toUpperCase());
  const match=old.find(q=>norm(q.title)===norm(r.Question)&&JSON.stringify(q.options.map(norm))===JSON.stringify(options));
  if(!match) throw Error('Unmatched source '+file+':'+(i+2));
  const valid=index>=0&&options[index]===norm(r['Correct Answer'])&&options.every(Boolean);
  const item={file,sheet,row:i+2,rule:'PSR '+String(r.Rule).padStart(6,'0'),section:norm(r.Section),feedback:norm(r['Google Quiz Feedback']).replace(/^Correct\.\s*/,''),valid,question:r.Question};
  rows.push(item);if(!valid)issues.push({...item,options,letter:r['Correct Option'],answer:r['Correct Answer']});
  // Only provenance and eligibility are updated; administrator edits and archive state are preserved.
  sql.push(`UPDATE questions SET section_key=${quote(valid?item.section:null)},rule_ref=${quote(item.rule)},rule_excerpt=${quote(item.feedback)},source_file=${quote(file+' / '+sheet)},source_row=${item.row} WHERE id=${quote(uuid(match.id))};`);
 }
}
// Authored workplace applications. Each entry is tied to one exact supplied source row.
const scenarios=[
 ['Chapter12_Section2.xlsx',5,'Your annual leave dates are pencilled into your diary, but your superior has not authorized your absence. A colleague urges you to travel tonight.',['Seek authorization before leaving','Travel because diary dates are sufficient','Let a colleague sign attendance for you','Treat the booking receipt as approval'],0,1],
 ['Chapter12_Section2.xlsx',12,'Your unit needs cover throughout the year. You propose splitting your annual leave into four separate blocks.',['Request four blocks as the normal arrangement','Revise the plan to one period or at most two instalments','Carry all leave into next year','Take only public holidays as annual leave'],1,1],
 ['Chapter12_Section2.xlsx',14,'You have approved annual leave and intend to spend it abroad. Your itinerary and overseas address are ready.',['Tell only your travelling companion','Wait until your return to mention the trip','Inform the Permanent Secretary/Head before departure and provide the address','Assume approval of leave replaces the notification'],2,2],
 ['Chapter12_Section2.xlsx',15,'While on vacation leave, you are formally required to perform official duty for several days. The leave ledger still counts those days as holiday.',['Keep counting the duty days as leave consumed','Delete the entire annual leave record','Treat the days as unpaid absence','Record the duty period as leave-earning, not leave-consuming'],3,2],
 ['Chapter12_Section2.xlsx',19,'Your leave was curtailed for an official assignment. The assignment is now complete and a colleague suggests saving the balance for several years.',['Arrange the curtailed portion immediately, no later than 90 days after the assignment','Save it indefinitely','Transfer the days to a colleague','Wait until retirement'],0,3],
 ['Chapter13_Section3.xlsx',2,'You wake up too ill to attend work. Your supervisor is expecting you, but no notification has been sent.',['Stay silent until you recover','Notify your ministry or agency in writing or by another means','Ask a friend to pretend you are in the office','Record the day as official travel'],1,1],
 ['Chapter13_Section3.xlsx',6,'You obtain medical treatment while away from your usual duty location. You have not yet told your employer.',['Wait for the next annual appraisal','Report only if asked','Report the treatment to your employer within 48 hours','Keep it private even if it explains absence'],2,1],
 ['Chapter13_Section3.xlsx',11,'An officer is so ill that they cannot visit the health provider. You are the next of kin assisting them.',['Wait until the officer can walk unaided','Ask a colleague to diagnose the illness','Issue your own excuse-duty certificate','Notify the health provider about the officer’s condition'],3,2],
 ['Chapter13_Section3.xlsx',19,'An officer remains unfit for duty after three months of certified illness. The file reaches your desk for the next step.',['Arrange referral to a Medical Board','Extend certificates indefinitely without review','Treat the officer as automatically retired','Delete the earlier certificates'],0,3],
 ['Chapter13_Section3.xlsx',25,'A Medical Board has issued recommendations that differ from the earlier advice of the health provider. You must process the case.',['Use whichever advice is more convenient','Follow the Medical Board recommendations, which supersede the provider’s advice','Ignore both until next year','Let a colleague choose without consulting the file'],1,3],
 ['Chapter2_Section2.xlsx',13,'A professional recruit needs additional qualifying experience before appointment in the full grade. You are preparing the appointment paperwork.',['Appoint permanently in the full grade with no training','Mark the recruit as retired','Use the applicable trainee or pupil appointment','Waive all professional requirements'],2,1],
 ['Chapter2_Section2.xlsx',16,'A trainee has satisfactorily completed the prescribed training. Your unit must prepare the next appointment action.',['Keep trainee status indefinitely','Dismiss the trainee automatically','Skip all confirmation requirements','Move to the full grade on probation'],3,2],
 ['Chapter2_Section2.xlsx',18,'An already confirmed officer is appointed to a training grade. HR asks how to treat the officer during training.',['Treat the arrangement as secondment','Cancel the existing confirmation automatically','Classify the officer as a new unconfirmed recruit','Record permanent abandonment of the old post'],0,2],
 ['Chapter2_Section2.xlsx',20,'A proposed training secondment would extend beyond the normal training period. You are asked to process it as routine.',['Approve any length without referral','Seek special advice from OHCSF for the longer period','Remove the training end date','Convert it into annual leave'],1,3],
 ['Chapter2_Section2.xlsx',23,'A confirmed officer in a lower post has been converted to a higher post. A draft letter places the officer on probation again solely because of that conversion.',['Sign the draft unchanged','Erase the earlier confirmation record','Revise the letter: the confirmed officer is not put on probation again on this basis','Treat the officer as a temporary visitor'],2,3],
 ['Chapter3_Section5.xlsx',3,'You are a newly appointed professional officer covered by the compulsory confirmation examination requirement. There is no Government exemption, and you are planning your development timetable.',['Leave the examination until retirement','Wait five years before considering it','Assume your degree automatically exempts you','Plan to pass within two years of appointment'],3,1],
 ['Chapter3_Section5.xlsx',6,'A direct appointee covered by the confirmation examination rule has served only three months and asks HR to register them immediately.',['Plan eligibility after six months of service','Declare immediate eligibility after one week','Require ten years of service','Tell the officer direct appointees can never sit'],0,1],
 ['Chapter3_Section5.xlsx',8,'An officer is promoted from an unconfirmed junior post into a covered professional grade. The officer believes promotion alone removes the confirmation examination requirement.',['Agree that promotion automatically removes it','Include the officer in the applicable examination requirement','Treat the officer as retired','Replace the examination with a private club membership'],1,2],
 ['Chapter3_Section5.xlsx',10,'An officer transfers from another Scheduled Service at age 35 and has not satisfied confirmation conditions. You review the examination requirement.',['Assume every transfer is exempt','Base the decision only on the new office location','Apply the requirement for transferred officers under 40 who have not satisfied confirmation conditions','Wait until the officer turns 60'],2,3],
 ['Chapter3_Section5.xlsx',13,'An officer is preparing for further advancement beyond GL. 10. A colleague suggests an attendance slip from any unapproved social seminar will suffice.',['Accept the social seminar slip','Ignore prescribed examinations','Use a residential association meeting as the qualification','Attend ASCON, PSIN, CMD or another approved institution and pass the prescribed examination'],3,3],
];
for(const [i,s] of scenarios.entries()){
 const [file,row,text,options,correct,tier]=s;const source=rows.find(r=>r.file===file&&r.row===row);
 if(!source?.valid)throw Error('Scenario source needs review '+file+':'+row);
 const explanation=source.feedback+' In this situation, the consistent action is: '+options[correct]+'. The other actions do not satisfy that requirement.';
 sql.push(`INSERT INTO questions(id,category,chapter,question_text,options,correct_option_index,explanation,section_key,rule_ref,rule_excerpt,source_file,source_row,question_kind,challenge_tier) VALUES(${quote(uuid('scenario-v1-'+i))},'PSR Dilemma',${quote(source.section)},${quote(text)},${quote(JSON.stringify(options))}::jsonb,${correct},${quote(explanation)},${quote(source.section)},${quote(source.rule)},${quote(source.feedback)},${quote(file+' / '+source.sheet)},${row},'scenario',${tier}) ON CONFLICT(id) DO NOTHING;`);
}
sql.push('COMMIT;');
fs.writeFileSync('supabase/seed_three_rounds.sql',sql.join('\n'));
fs.writeFileSync('supabase/content-review.json',JSON.stringify({sourceRows:rows.length,eligibleQuizRows:rows.length-issues.length,scenarios:scenarios.length,excludedForConflictingAnswerKeys:issues,scenarioSources:scenarios.map(s=>({file:s[0],row:s[1],scenario:s[2]}))},null,2));
console.log(`${rows.length} source rows; ${issues.length} conflicting answer keys excluded from tournament selection; ${scenarios.length} sourced scenarios.`);
