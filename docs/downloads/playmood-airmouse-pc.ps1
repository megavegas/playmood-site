# PlayMood Air Mouse — Windows companion (fast Wi-Fi path)
#
# Run on the PC (same Wi-Fi as the phone):
#   powershell -ExecutionPolicy Bypass -File "apps\melody-android\tools\playmood-airmouse-pc.ps1"
#
# Then on the phone: Air Mouse → Scan PC  (or enter this PC's IP and Link)
# Move the phone in the air; Vol- / Vol+ click.
#
# Firewall: allow inbound UDP 39285 for PowerShell / this script if Windows asks.

param(
    [int]$Port = 39285
)

$ErrorActionPreference = "Stop"
$Host.UI.RawUI.WindowTitle = "PlayMood Air Mouse PC · UDP $Port"

Write-Host ""
Write-Host " PlayMood Air Mouse — Windows companion" -ForegroundColor Yellow
Write-Host " Listening UDP $Port  ·  broadcasting host beacon"
Write-Host " Keep this window open. Phone and PC must share Wi-Fi."
Write-Host " Press Ctrl+C to stop."
Write-Host ""

Add-Type -TypeDefinition @"
using System;
using System.Net;
using System.Net.Sockets;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;

public static class PlayMoodAirMouseHost {
    [StructLayout(LayoutKind.Sequential)]
    struct INPUT {
        public uint type;
        public MOUSEINPUT mi;
    }
    [StructLayout(LayoutKind.Sequential)]
    struct MOUSEINPUT {
        public int dx;
        public int dy;
        public uint mouseData;
        public uint dwFlags;
        public uint time;
        public IntPtr dwExtraInfo;
    }

    const uint INPUT_MOUSE = 0;
    const uint MOUSEEVENTF_MOVE = 0x0001;
    const uint MOUSEEVENTF_LEFTDOWN = 0x0002;
    const uint MOUSEEVENTF_LEFTUP = 0x0004;
    const uint MOUSEEVENTF_RIGHTDOWN = 0x0008;
    const uint MOUSEEVENTF_RIGHTUP = 0x0010;

    [DllImport("user32.dll", SetLastError = true)]
    static extern uint SendInput(uint nInputs, INPUT[] pInputs, int cbSize);

    static void Move(int dx, int dy) {
        if (dx == 0 && dy == 0) return;
        INPUT[] arr = new INPUT[1];
        arr[0].type = INPUT_MOUSE;
        arr[0].mi.dx = dx;
        arr[0].mi.dy = dy;
        arr[0].mi.dwFlags = MOUSEEVENTF_MOVE;
        SendInput(1, arr, Marshal.SizeOf(typeof(INPUT)));
    }

    static byte lastButtons = 0;

    static void Buttons(byte buttons) {
        INPUT[] arr = new INPUT[2];
        int n = 0;
        if (((buttons ^ lastButtons) & 1) != 0) {
            arr[n].type = INPUT_MOUSE;
            arr[n].mi.dwFlags = ((buttons & 1) != 0) ? MOUSEEVENTF_LEFTDOWN : MOUSEEVENTF_LEFTUP;
            n++;
        }
        if (((buttons ^ lastButtons) & 2) != 0) {
            arr[n].type = INPUT_MOUSE;
            arr[n].mi.dwFlags = ((buttons & 2) != 0) ? MOUSEEVENTF_RIGHTDOWN : MOUSEEVENTF_RIGHTUP;
            n++;
        }
        lastButtons = buttons;
        if (n > 0) SendInput((uint)n, arr, Marshal.SizeOf(typeof(INPUT)));
    }

    static void Click(byte mask) {
        uint down = 0, up = 0;
        if ((mask & 1) != 0) { down = MOUSEEVENTF_LEFTDOWN; up = MOUSEEVENTF_LEFTUP; }
        else if ((mask & 2) != 0) { down = MOUSEEVENTF_RIGHTDOWN; up = MOUSEEVENTF_RIGHTUP; }
        else return;
        INPUT[] arr = new INPUT[2];
        arr[0].type = INPUT_MOUSE; arr[0].mi.dwFlags = down;
        arr[1].type = INPUT_MOUSE; arr[1].mi.dwFlags = up;
        SendInput(2, arr, Marshal.SizeOf(typeof(INPUT)));
    }

    public static void Run(int port) {
        var udp = new UdpClient(port);
        udp.EnableBroadcast = true;
        Console.WriteLine("Bound " + port);

        var beacon = new Thread(() => {
            var payload = Encoding.UTF8.GetBytes("PMAM1|HOST|" + Environment.MachineName);
            var ep = new IPEndPoint(IPAddress.Broadcast, port);
            while (true) {
                try { udp.Send(payload, payload.Length, ep); } catch { }
                Thread.Sleep(1500);
            }
        });
        beacon.IsBackground = true;
        beacon.Start();

        IPEndPoint remote = new IPEndPoint(IPAddress.Any, 0);
        while (true) {
            byte[] data = udp.Receive(ref remote);
            if (data == null || data.Length < 4) continue;

            // ASCII hello from phone
            string asText = Encoding.UTF8.GetString(data).Trim();
            if (asText.StartsWith("PMAM1|HELLO|")) {
                var reply = Encoding.UTF8.GetBytes("PMAM1|HOST|" + Environment.MachineName);
                try { udp.Send(reply, reply.Length, remote); } catch { }
                Console.WriteLine("Phone hello from " + remote.Address);
                continue;
            }

            // Binary PMAM
            if (data.Length >= 6 && data[0] == (byte)'P' && data[1] == (byte)'M' && data[2] == (byte)'A' && data[3] == (byte)'M') {
                byte ver = data[4];
                byte type = data[5];
                if (ver != 1) continue;
                if (type == 1 && data.Length >= 10) {
                    short dx = BitConverter.ToInt16(data, 6);
                    short dy = BitConverter.ToInt16(data, 8);
                    Move(dx, dy);
                } else if (type == 2 && data.Length >= 7) {
                    Buttons(data[6]);
                } else if (type == 3 && data.Length >= 7) {
                    Click(data[6]);
                }
            }
        }
    }
}
"@

try {
    [PlayMoodAirMouseHost]::Run($Port)
} catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "If port is in use, close other PlayMood Air Mouse windows."
    exit 1
}
