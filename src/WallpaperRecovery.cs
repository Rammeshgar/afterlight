using System;
namespace Afterlight {
    sealed class SceneHealth {
        public SceneHealth(){}
        public int frame{get;set;}
        public string scene{get;set;}
        public string lighting{get;set;}
#if AFTERLIGHT_CINEMA
        public string artwork{get;set;}
#endif
        public bool paused{get;set;}
        public bool hostPaused{get;set;}
        public bool reduced{get;set;}
        public bool hidden{get;set;}
        public bool rafActive{get;set;}
    }
    // Placement is not proof of rendering. Require advancing frames and a
    // visible, scheduled scene; intentional pause/reduced motion is not a fault.
    sealed class RendererRecovery {
        int lastFrame=-1,stalls;
        bool verified;
        internal int Repairs{get;private set;}
        internal bool NeedsRepair{get{return stalls>=2;}}
        internal bool JustVerified{get;private set;}
        internal void Reset(){lastFrame=-1;stalls=0;verified=false;Repairs=0;JustVerified=false;}
        internal bool Observe(int frame,bool expected,bool scheduled){
            JustVerified=false;
            if(!expected){lastFrame=frame;stalls=0;return false;}
            bool advancing=frame>=0&&lastFrame>=0&&frame>lastFrame&&scheduled;
            if(advancing){stalls=0;Repairs=0;JustVerified=!verified;verified=true;}
            else if(lastFrame>=0||frame<0){stalls++;verified=false;}
            lastFrame=frame;return advancing;
        }
        internal void RepairAttempted(){Repairs++;stalls=0;lastFrame=-1;verified=false;}
    }
    // Automatic recovery never changes user intent to preview/settings mode.
    // Windows-owned handles are hints, not durable identity or health signals.
    sealed class WallpaperRecovery {
        internal bool Wanted{get;private set;}
        internal bool Waiting{get;private set;}
        internal int Failures{get;private set;}
        internal double NextAttempt{get;private set;}
        internal void Begin(){Wanted=true;Attached();}
        internal void Cancel(){Wanted=false;Waiting=false;Failures=0;NextAttempt=0;}
        internal void Hold(){if(Wanted)Waiting=true;}
        internal bool CanAttempt(double now){return Wanted&&now>=NextAttempt;}
        internal void Failed(double now){if(!Wanted)return;Waiting=true;Failures=Math.Min(30,Failures+1);NextAttempt=now+Math.Min(5,.25*Math.Pow(2,Math.Min(5,Failures-1)));}
        internal void Attached(){Waiting=false;Failures=0;NextAttempt=0;}
    }
}
