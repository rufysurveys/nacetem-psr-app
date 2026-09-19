import React from 'react';import {createRoot} from 'react-dom/client';
import {RemoteMatchRoom} from '../src/components/quiz/RemoteMatchRoom';import {ProctorPanel} from '../src/components/quiz/ProctorPanel';import {useStore} from '../src/store/useStore';import portrait from '../src/assets/dg_photo.webp';import '../src/index.css';
const win=window as any;win.portrait=portrait;win.proctorReady=false;
useStore.setState({user:{id:'00000000-0000-4000-8000-000000000001',name:'Host'} as any,selectedOpponent:{gameId:'10000000-0000-4000-8000-000000000001'}});
const root=createRoot(document.getElementById('root')!);
win.renderProctor=()=>root.render(<ProctorPanel gameId="10000000-0000-4000-8000-000000000001" host={false} active onReady={r=>win.proctorReady=r}/>);
win.setGuest=()=>useStore.setState({user:{id:'00000000-0000-4000-8000-000000000002',name:'Guest'} as any});
root.render(<RemoteMatchRoom/>);
