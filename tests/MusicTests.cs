using System;
using Afterlight;
class MusicTests {
    static void Check(bool condition,string message){if(!condition)throw new Exception(message);}
    static MusicFrame Tone(double hz,double amplitude=.22){var s=new MusicSpectrum(24000);for(int i=0;i<8192;i++)s.Push(amplitude*Math.Sin(2*Math.PI*hz*i/24000));Check(s.Frames>0,"FFT did not run");return s.Snapshot();}
    static int Main(){try{
        var low=Tone(94);Check(low.bass>low.mid*5&&low.bass>low.high*5,"Bass isolation");
        var mid=Tone(1000);Check(mid.mid>mid.bass*5&&mid.mid>mid.high*5,"Mid isolation");
        var high=Tone(6000);Check(high.high>high.mid*5&&high.high>high.bass*5,"High isolation");
        var quiet=Tone(1000,.004);Check(quiet.level>.01&&quiet.level<.02&&quiet.mid>0,"Quiet playback energy must survive analysis");
        var s=new MusicSpectrum(24000);for(int i=0;i<4096;i++)s.Push(0);Check(s.Snapshot().level==0,"Silence must be zero");
        for(int i=0;i<4096;i++)s.Push(i%2==0?Double.NaN:Double.PositiveInfinity);Check(s.Snapshot().level==0,"Nonfinite audio must be ignored");
        foreach(var f in new[]{low,mid,high})foreach(double n in f.bands)Check(n>=0&&n<=1&&!Double.IsNaN(n),"Bounded spectrum");
        Console.WriteLine("PASS: synthetic bass/mid/high separation, quiet playback, silence, invalid samples, normalized spectrum. No device capture used.");return 0;
    }catch(Exception ex){Console.Error.WriteLine(ex.Message);return 1;}}
}
