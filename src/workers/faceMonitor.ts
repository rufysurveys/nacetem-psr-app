import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
let model: FaceLandmarker | null=null;
self.onmessage=async(e:MessageEvent)=>{
 try{
  if(e.data.type==='init'){
   const files=await FilesetResolver.forVisionTasks(e.data.origin+'/proctor/wasm');
   model=await FaceLandmarker.createFromOptions(files,{baseOptions:{modelAssetPath:e.data.origin+'/proctor/face_landmarker.task',delegate:'CPU'},runningMode:'VIDEO',numFaces:2,outputFaceBlendshapes:true});
   self.postMessage({type:'ready'});
  }else if(e.data.type==='frame'&&model){
   const frame=e.data.frame as ImageBitmap;
   try{const result=model.detectForVideo(frame,e.data.time);const eyes=result.faceBlendshapes[0]?.categories.filter(c=>/^eyeLook(Out|In|Up|Down)/.test(c.categoryName))||[];
    self.postMessage({type:'result',faces:result.faceLandmarks.length,gazeAway:eyes.some(c=>c.score>0.65)});
   }finally{frame.close();}
  }
 }catch(error){self.postMessage({type:'error',message:error instanceof Error?error.message:'Face monitor failed'});}
};
