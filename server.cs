using System;
using System.Net;
using System.IO;
using System.Threading;

public class SimpleWebServer {
    public static void Start() {
        HttpListener listener = new HttpListener();
        listener.Prefixes.Add("http://localhost:8080/");
        listener.Start();
        Console.WriteLine("Listening on http://localhost:8080/");
        
        while (true) {
            HttpListenerContext context = listener.GetContext();
            ThreadPool.QueueUserWorkItem((c) => {
                var ctx = (HttpListenerContext)c;
                try {
                    string path = "C:\\Users\\admin\\Documents\\trae_projects\\Jake" + ctx.Request.Url.LocalPath.Replace("/", "\\");
                    if (path.EndsWith("\\")) path += "index.html";
                    
                    if (File.Exists(path)) {
                        string ext = Path.GetExtension(path).ToLower();
                        if (ext == ".html") ctx.Response.ContentType = "text/html";
                        else if (ext == ".js") ctx.Response.ContentType = "application/javascript";
                        else if (ext == ".css") ctx.Response.ContentType = "text/css";
                        
                        byte[] buffer = File.ReadAllBytes(path);
                        ctx.Response.ContentLength64 = buffer.Length;
                        ctx.Response.OutputStream.Write(buffer, 0, buffer.Length);
                    } else {
                        ctx.Response.StatusCode = 404;
                    }
                } catch {
                    ctx.Response.StatusCode = 500;
                } finally {
                    ctx.Response.Close();
                }
            }, context);
        }
    }
}
