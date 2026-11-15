using System;
namespace Afterlight {
    class HostLifecycleTests {
        static void Check(bool value,string name){if(!value)throw new Exception(name);}
        static int Main(){try{
            var recovery=new WallpaperRecovery();Check(!recovery.CanAttempt(0),"Preview cannot auto-attach");
            recovery.Begin();Check(recovery.Wanted&&!recovery.Waiting,"User requested wallpaper");
            recovery.Hold();Check(recovery.Wanted&&recovery.Waiting,"Transient failure preserves wallpaper intent");
            recovery.Failed(0);Check(!recovery.CanAttempt(.1)&&recovery.CanAttempt(.25),"Initial retry is delayed");
            double now=1;for(int i=0;i<50;i++){recovery.Failed(now);Check(recovery.NextAttempt-now<=5,"Bounded retry interval");Check(recovery.Wanted,"Failure must never open preview");now+=6;}
            recovery.Attached();Check(recovery.Wanted&&!recovery.Waiting&&recovery.Failures==0,"Recovery returns to wallpaper, not UI");
            recovery.Cancel();Check(!recovery.Wanted&&!recovery.Waiting&&!recovery.CanAttempt(now),"Explicit user exit cancels retries");
            recovery.Failed(now);Check(!recovery.Wanted&&!recovery.Waiting,"Late failure cannot reactivate user-dismissed wallpaper");
            var renderer=new RendererRecovery();
            Check(!renderer.Observe(10,true,true)&&!renderer.NeedsRepair,"Initial frame is only a baseline");
            Check(renderer.Observe(40,true,true)&&renderer.JustVerified,"Advancing scheduled frames verify rendering");
            renderer.Observe(40,true,true);renderer.Observe(40,true,true);Check(renderer.NeedsRepair,"Stationary frames cannot be called recovered");
            renderer.RepairAttempted();Check(renderer.Repairs==1&&!renderer.NeedsRepair,"Bounded repair attempt");
            renderer.Observe(40,true,false);renderer.Observe(40,true,false);renderer.Observe(40,true,false);Check(renderer.NeedsRepair,"Hidden or unscheduled renderer needs repair");
            renderer.RepairAttempted();Check(renderer.Repairs==2,"Persistent stall escalates");
            renderer.Observe(40,true,true);Check(renderer.Observe(80,true,true)&&renderer.Repairs==0,"Actual frame progress clears repair count");
            for(int i=0;i<50;i++)renderer.Observe(80,false,false);Check(!renderer.NeedsRepair,"Intentional pause never triggers repair");
            renderer.Reset();renderer.Observe(-1,true,false);renderer.Observe(-1,true,false);Check(renderer.NeedsRepair,"Missing scene is a detectable fault");
            var health=new System.Web.Script.Serialization.JavaScriptSerializer().Deserialize<SceneHealth>("{\"frame\":340,\"paused\":false,\"hostPaused\":false,\"reduced\":false,\"hidden\":false,\"rafActive\":true}");
            Check(health.frame==340&&health.rafActive&&!health.hidden,"Real scene-health JSON must deserialize correctly");
            Console.WriteLine("PASS: wallpaper intent, quiet recovery, bounded backoff, successful reattach, explicit user exit; 50 simulated repeated failures.");return 0;
        }catch(Exception ex){Console.Error.WriteLine(ex.Message);return 1;}}
    }
}
