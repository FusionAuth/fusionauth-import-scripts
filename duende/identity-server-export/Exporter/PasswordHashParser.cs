using System;
using Microsoft.AspNetCore.Cryptography.KeyDerivation;

namespace Exporter
{
    /// <summary>
    /// Parses a password hash from an ASP Identity database.
    /// The Hashing algorithms can be viewed at https://github.com/dotnet/aspnetcore/blob/v6.0.14/src/Identity/Extensions.Core/src/PasswordHasher.cs
    /// This
    /// </summary>
	public class PasswordHashParser
	{
		public PasswordHashParser(string passwordHash)
		{
            if (passwordHash == null)
            {
                throw new ArgumentNullException(nameof(passwordHash));
            }

            ParsePasswordHash(passwordHash);
		}

        public string Salt { get; private set; }
        public string Hash { get; private set; }
        public string Version { get; private set; }
        public KeyDerivationPrf Algorithm { get; private set; }
        public int Iterations { get; private set; }


        private void ParsePasswordHash(string passwordHash)
        {

            byte[] byteBuffer = System.Convert.FromBase64String(passwordHash);

            // Get the version:
            var version = byteBuffer[0];
            if (version == 0x00)
            {
                this.Version = "v2";
                ParseV2(byteBuffer);
            }
            else if (version == 0x01)
            {
                this.Version = "v3";
                ParseV3(byteBuffer);
            }
            else throw new ArgumentOutOfRangeException("passwordHash", "The version of the passwordHash could not be determined");

        }

        /// <summary>
        /// * From https://github.com/dotnet/aspnetcore/blob/v6.0.14/src/Identity/Extensions.Core/src/PasswordHasher.cs
        /// * Version 2:
        /// * PBKDF2 with HMAC-SHA1, 128-bit salt, 256-bit subkey, 1000 iterations.
        /// * (See also: SDL crypto guidelines v5.1, Part III)
        /// * Format: { 0x00, salt, subkey}
        /// </summary>
        /// <param name="byteBuffer"></param>
        private void ParseV2(byte[] byteBuffer)
        {
            this.Algorithm = KeyDerivationPrf.HMACSHA1; // default for Rfc2898DeriveBytes
            this.Iterations = 1000; // default for Rfc2898DeriveBytes
            const int hashLength = 256 / 8; // 256 bits
            const int saltLength = 128 / 8; // 128 bits

            this.Salt = Convert.ToBase64String(GetSubArray(byteBuffer, 1, saltLength, false));
            this.Hash = Convert.ToBase64String(GetSubArray(byteBuffer, 1 + saltLength, hashLength, false));
        }


        /// <summary>
        /// * From https://github.com/dotnet/aspnetcore/blob/v6.0.14/src/Identity/Extensions.Core/src/PasswordHasher.cs
        /// * Version 3
        /// * PBKDF2 with HMAC-SHA256, 128-bit salt, 256-bit subkey, 10000 iterations.
        /// * Format: { 0x01, prf (UInt32), iter count(UInt32), salt length(UInt32), salt, subkey}
        /// * (All UInt32s are stored big-endian.)
        /// </summary>
        /// <param name="byteBuffer"></param>
        /// <exception cref="ArgumentOutOfRangeException"></exception>
        private void ParseV3(byte[] byteBuffer)
        {
            int algo = BitConverter.ToInt32(GetSubArray(byteBuffer, 1, 4, BitConverter.IsLittleEndian));
            switch (algo)
            {
                case 0:
                    this.Algorithm = KeyDerivationPrf.HMACSHA1;
                    break;
                case 1:
                    this.Algorithm = KeyDerivationPrf.HMACSHA256;
                    break;
                case 2:
                    this.Algorithm = KeyDerivationPrf.HMACSHA512;
                    break;
                default:
                    throw new ArgumentOutOfRangeException("passwordHash", "Unknown algorithm");
            }

            this.Iterations = BitConverter.ToInt32(GetSubArray(byteBuffer, 5, 4, BitConverter.IsLittleEndian));

            var saltLength = BitConverter.ToInt32(GetSubArray(byteBuffer, 9, 4, BitConverter.IsLittleEndian));
            this.Salt = Convert.ToBase64String(GetSubArray(byteBuffer, 13, saltLength, false));

            this.Hash = Convert.ToBase64String(GetSubArray(byteBuffer, 13 + saltLength, byteBuffer.Length - (13 + saltLength), false));

        }

        private byte[] GetSubArray(byte[] array, int start, int length, bool reverse)
        {
            byte[] subArray = new byte[length];

            Buffer.BlockCopy(array, start, subArray, 0, length);
            
            if (reverse)
            {
                Array.Reverse(subArray);
            }

            return subArray;
        }

    }
}

