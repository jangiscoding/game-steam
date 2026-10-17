using System;
using System.IO;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;

public class NativeIconMaker {
    public static void CreateIco(string imagePath, string icoPath) {
        using (Bitmap src = new Bitmap(imagePath)) {
            int[] sizes = new int[] { 16, 32, 48, 64, 128, 256 };
            byte[][] imageBuffers = new byte[sizes.Length][];
            bool[] isPng = new bool[sizes.Length];

            for (int i = 0; i < sizes.Length; i++) {
                int s = sizes[i];
                using (Bitmap resized = new Bitmap(s, s, PixelFormat.Format32bppArgb)) {
                    using (Graphics g = Graphics.FromImage(resized)) {
                        g.SmoothingMode = SmoothingMode.HighQuality;
                        g.InterpolationMode = InterpolationMode.HighQualityBicubic;
                        g.PixelOffsetMode = PixelOffsetMode.HighQuality;
                        g.CompositingQuality = CompositingQuality.HighQuality;
                        g.Clear(Color.Transparent);
                        g.DrawImage(src, new Rectangle(0, 0, s, s));
                    }

                    if (s == 256) {
                        // 256x256 can be PNG
                        using (MemoryStream ms = new MemoryStream()) {
                            resized.Save(ms, ImageFormat.Png);
                            imageBuffers[i] = ms.ToArray();
                            isPng[i] = true;
                        }
                    } else {
                        // Standard BMP DIB format (100% compatible with Windows Shell)
                        imageBuffers[i] = CreateDibBuffer(resized, s);
                        isPng[i] = false;
                    }
                }
            }

            using (FileStream fs = new FileStream(icoPath, FileMode.Create)) {
                using (BinaryWriter bw = new BinaryWriter(fs)) {
                    // Header
                    bw.Write((ushort)0); // reserved
                    bw.Write((ushort)1); // type 1 = ICO
                    bw.Write((ushort)sizes.Length); // count

                    int offset = 6 + (16 * sizes.Length);
                    for (int i = 0; i < sizes.Length; i++) {
                        int s = sizes[i];
                        bw.Write((byte)(s >= 256 ? 0 : s)); // Width
                        bw.Write((byte)(s >= 256 ? 0 : s)); // Height
                        bw.Write((byte)0); // Colors
                        bw.Write((byte)0); // Reserved
                        bw.Write((ushort)1); // Planes
                        bw.Write((ushort)32); // Bit count
                        bw.Write((uint)imageBuffers[i].Length); // Size of image data
                        bw.Write((uint)offset); // Offset
                        offset += imageBuffers[i].Length;
                    }

                    for (int i = 0; i < sizes.Length; i++) {
                        bw.Write(imageBuffers[i]);
                    }
                }
            }
        }
    }

    private static byte[] CreateDibBuffer(Bitmap bmp, int size) {
        int width = size;
        int height = size;
        int imageSize = width * height * 4;
        int maskRowStride = ((width + 31) / 32) * 4;
        int maskSize = maskRowStride * height;
        int headerSize = 40;
        int totalSize = headerSize + imageSize + maskSize;

        byte[] buffer = new byte[totalSize];
        using (MemoryStream ms = new MemoryStream(buffer)) {
            using (BinaryWriter bw = new BinaryWriter(ms)) {
                // BITMAPINFOHEADER
                bw.Write((uint)headerSize);
                bw.Write((int)width);
                bw.Write((int)(height * 2)); // Combined height (XOR + AND)
                bw.Write((ushort)1); // Planes
                bw.Write((ushort)32); // BitCount
                bw.Write((uint)0); // BI_RGB
                bw.Write((uint)imageSize);
                bw.Write((int)0); // XPelsPerMeter
                bw.Write((int)0); // YPelsPerMeter
                bw.Write((uint)0); // ClrUsed
                bw.Write((uint)0); // ClrImportant

                // Pixel data: bottom-up 32bpp BGRA
                BitmapData data = bmp.LockBits(new Rectangle(0, 0, width, height), ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
                try {
                    byte[] row = new byte[width * 4];
                    for (int y = height - 1; y >= 0; y--) {
                        IntPtr rowPtr = IntPtr.Add(data.Scan0, y * data.Stride);
                        System.Runtime.InteropServices.Marshal.Copy(rowPtr, row, 0, row.Length);
                        bw.Write(row);
                    }
                } finally {
                    bmp.UnlockBits(data);
                }

                // AND mask (all 0 for transparent / 32bpp alpha handles it)
                byte[] mask = new byte[maskSize];
                bw.Write(mask);
            }
        }
        return buffer;
    }
}
