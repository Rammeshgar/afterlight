using System;
using System.Diagnostics;
using NAudio.CoreAudioApi;
using NAudio.Wave;

namespace Afterlight {
    // No audio writer or playback path. Raw samples only live in these temporary
    // analysis buffers; the UI receives normalized band energies, never audio.
    sealed class MusicFrame {
        public double level,bass,mid,high;
        public double[] bands=new double[16];
        public long timestamp;
    }
    sealed class MusicSpectrum {
        const int N=2048;
        readonly double[] ring=new double[N],real=new double[N],imag=new double[N],window=new double[N];
        readonly object gate=new object();
        readonly int rate;
        int position,filled,hop;
        MusicFrame latest=new MusicFrame();
        internal int Frames{get;private set;}
        internal MusicSpectrum(int sampleRate){rate=sampleRate;for(int i=0;i<N;i++)window[i]=.5-.5*Math.Cos(2*Math.PI*i/(N-1));}
        static double Bound(double v){return Double.IsNaN(v)||Double.IsInfinity(v)?0:Math.Max(0,Math.Min(1,v));}
        internal void Push(double sample){
            lock(gate){
                ring[position]=Double.IsNaN(sample)||Double.IsInfinity(sample)?0:Math.Max(-1,Math.Min(1,sample));position=(position+1)%N;filled=Math.Min(N,filled+1);
                if(++hop>=1024&&filled==N){hop=0;Analyse();}
            }
        }
        void Analyse(){
            double rms=0;
            for(int i=0;i<N;i++){double s=ring[(position+i)%N];rms+=s*s;real[i]=s*window[i];imag[i]=0;}
            for(int i=1,j=0;i<N;i++){
                int bit=N>>1;for(; (j&bit)!=0;bit>>=1)j^=bit;j^=bit;
                if(i<j){double v=real[i];real[i]=real[j];real[j]=v;}
            }
            for(int len=2;len<=N;len<<=1){
                double angle=-2*Math.PI/len,wr0=Math.Cos(angle),wi0=Math.Sin(angle);
                for(int i=0;i<N;i+=len){double wr=1,wi=0;for(int j=0;j<len/2;j++){
                    int a=i+j,b=a+len/2;double vr=real[b]*wr-imag[b]*wi,vi=real[b]*wi+imag[b]*wr;
                    real[b]=real[a]-vr;imag[b]=imag[a]-vi;real[a]+=vr;imag[a]+=vi;
                    double next=wr*wr0-wi*wi0;wi=wr*wi0+wi*wr0;wr=next;
                }}
            }
            var f=new MusicFrame{level=Bound(Math.Sqrt(rms/N)*4),timestamp=Stopwatch.GetTimestamp()};
            double bass=0,mid=0,high=0;double[] energy=new double[16];
            for(int k=1;k<N/2;k++){
                double hz=(double)k*rate/N,m=(real[k]*real[k]+imag[k]*imag[k])*4/(N*N);
                if(hz>=35&&hz<180)bass+=m;else if(hz>=180&&hz<2500)mid+=m;else if(hz>=2500&&hz<10000)high+=m;
                int band=(int)Math.Floor(Math.Log(Math.Max(40,hz)/40)/Math.Log(10000.0/40)*16);
                if(hz>=40&&hz<10000&&band>=0&&band<16)energy[band]+=m;
            }
            f.bass=Bound(Math.Sqrt(bass)*6);f.mid=Bound(Math.Sqrt(mid)*6);f.high=Bound(Math.Sqrt(high)*7);
            for(int i=0;i<16;i++)f.bands[i]=Bound(Math.Sqrt(energy[i])*7);
            latest=f;Frames++;
        }
        internal MusicFrame Snapshot(){lock(gate){return (Stopwatch.GetTimestamp()-latest.timestamp)/(double)Stopwatch.Frequency>.4?new MusicFrame():latest;}}
    }
    sealed class MusicInput:IDisposable {
        WasapiLoopbackCapture capture;
        MMDevice device;
        MusicSpectrum spectrum;
        int channels,bytesPerSample,stride,sampleCounter;
        bool floating;
        volatile bool running;
        internal bool Running{get{return running;}}
        internal string DeviceName{get;private set;}
#if !AFTERLIGHT_CINEMA
        internal string Error{get;private set;}
#endif
        internal int Frames{get{return spectrum==null?0:spectrum.Frames;}}
        internal bool IsDefaultOutput(){
            if(device==null)return false;
            using(var enumerator=new MMDeviceEnumerator())
            using(var current=enumerator.GetDefaultAudioEndpoint(DataFlow.Render,Role.Multimedia))return current.ID==device.ID;
        }
        internal void Start(){
            if(capture!=null)return;
#if !AFTERLIGHT_CINEMA
            Error=null;
#endif
            try{
                using(var enumerator=new MMDeviceEnumerator())device=enumerator.GetDefaultAudioEndpoint(DataFlow.Render,Role.Multimedia);
                DeviceName=device.FriendlyName;capture=new WasapiLoopbackCapture(device);
                var format=capture.WaveFormat;channels=format.Channels;bytesPerSample=format.BitsPerSample/8;
                var ext=format as WaveFormatExtensible;
                floating=format.Encoding==WaveFormatEncoding.IeeeFloat||(ext!=null&&ext.SubFormat==new Guid("00000003-0000-0010-8000-00aa00389b71"));
                if((floating&&bytesPerSample!=4)||(!floating&&bytesPerSample!=2&&bytesPerSample!=3&&bytesPerSample!=4)||channels<1)throw new NotSupportedException("This output device's sample format is not supported.");
                stride=format.SampleRate>32000?2:1;spectrum=new MusicSpectrum(format.SampleRate/stride);sampleCounter=0;
                capture.DataAvailable+=Data;
#if AFTERLIGHT_CINEMA
                capture.RecordingStopped+=(s,e)=>running=false;
#else
                capture.RecordingStopped+=(s,e)=>{running=false;if(e.Exception!=null)Error="Audio output changed or became unavailable. Switch music reaction off and on to reconnect.";};
#endif
                running=true;capture.StartRecording();
            }catch{Dispose();throw;}
        }
        void Data(object sender,WaveInEventArgs e){
            if(!running||spectrum==null)return;
            int frameBytes=channels*bytesPerSample;
            for(int p=0;p+frameBytes<=e.BytesRecorded;p+=frameBytes){
                if(sampleCounter++%stride!=0)continue;
                double mono=0;
                for(int c=0;c<channels;c++){
                    int a=p+c*bytesPerSample;
                    if(floating)mono+=BitConverter.ToSingle(e.Buffer,a);
                    else if(bytesPerSample==2)mono+=BitConverter.ToInt16(e.Buffer,a)/32768.0;
                    else if(bytesPerSample==3){int n=e.Buffer[a]|e.Buffer[a+1]<<8|e.Buffer[a+2]<<16;if((n&0x800000)!=0)n|=unchecked((int)0xff000000);mono+=n/8388608.0;}
                    else mono+=BitConverter.ToInt32(e.Buffer,a)/2147483648.0;
                }
                spectrum.Push(mono/channels);
            }
        }
        internal MusicFrame Snapshot(){return running&&spectrum!=null?spectrum.Snapshot():new MusicFrame();}
        public void Dispose(){
            running=false;var previous=capture;capture=null;
            if(previous!=null){previous.DataAvailable-=Data;try{previous.StopRecording();}catch{}try{previous.Dispose();}catch{}}
            if(device!=null){try{device.Dispose();}catch{}device=null;}
            spectrum=null;
        }
    }
}
