using System;
using System.Text;
using System.Collections.Generic;
using System.Data.SqlClient;
using System.Linq;
using System.Xml;
using Newtonsoft.Json;
using Newtonsoft.Json.Serialization;
using Microsoft.AspNetCore.Cryptography.KeyDerivation;

namespace Exporter
{
    class Program
    {
        static void Main(string[] args)
        {
            var users = new List<User>();
            var connectionString = "Server=localhost;Database=duende;User Id=sa;Password=YourStrong@Passw0rd;TrustServerCertificate=true;";
            Console.WriteLine($"Connecting to database...");
            using (var connection = new SqlConnection(connectionString))
            {
                connection.Open();
                using (var command = new SqlCommand("SELECT * FROM AspNetUsers LEFT JOIN AspNetUserLogins ON AspNetUsers.Id = AspNetUserLogins.UserId", connection))
                using (var reader = command.ExecuteReader())
                {
                    int currUser = 0; 
                    while (reader.Read())
                    {
                        Console.WriteLine($"Exporting user {currUser}...");
                        var passwordHash = reader["PasswordHash"].ToString();
                        PasswordHashParser hashParser = null;
                        if (!String.IsNullOrWhiteSpace(passwordHash))
                        {
                            hashParser = new PasswordHashParser(passwordHash);
                        }

                        var user = new User
                        {
                            Active = true,
                            Email = reader["Email"].ToString(),
                            Expiry = null,      //TODO: Add in if your DB has this info
                            FirstName = "",     //TODO: Add in if your DB has this info
                            FullName = "",      //TODO: Add in if your DB has this info
                            Id = reader["Id"].ToString(),
                            LastName = "",      //TODO: Add in if your DB has this info
                            MiddleName = "",    //TODO: Add in if your DB has this info
                            InsertInstance = new DateTimeOffset(DateTime.Now).ToUnixTimeSeconds() *1000,// TODO: Add in if your DB has this info
                            MobilePhone = reader["PhoneNumber"].ToString(),
                            PasswordChangeRequired = false,
                            PreferredLanguages = new List<string> { "en" }, //TODO: Add in if your DB has this info
                            IdentityProviders = new Dictionary<string, string>(),
                            TwoFactorEnabled = reader["TwoFactorEnabled"].ToString() == "True",
                            Username = reader["UserName"].ToString(),
                            Verified = reader["EmailConfirmed"].ToString() == "True"
                        };

                        if (hashParser != null)
                        {
                            user.Password = hashParser.Hash;
                            user.Salt = hashParser.Salt;

                            if (hashParser.Version == "v3")
                            {
                                // See https://fusionauth.io/docs/v1/tech/apis/users#import-users for default supported hashing schemes
                                // To add a custom hashing scheme to FusionAuth, see https://fusionauth.io/docs/v1/tech/plugins/custom-password-hashing  
                                switch (hashParser.Algorithm)
                                {
                                    case KeyDerivationPrf.HMACSHA1:
                                        throw new NotImplementedException("HMACSHA1 is not supported by default in FusionAuth. See https://fusionauth.io/docs/v1/tech/plugins/custom-password-hashing to add a custom hash algorithm");
                                    case KeyDerivationPrf.HMACSHA256:
                                        user.EncryptionScheme = "salted-pbkdf2-hmac-sha256";
                                        break;
                                    case KeyDerivationPrf.HMACSHA512:
                                        user.EncryptionScheme = "salted-pbkdf2-hmac-sha512-512";
                                        break;
                                    default:
                                        throw new ArgumentOutOfRangeException("Algorithm", "Unknown hashing algorithm");
                                }
                            }
                            else if (hashParser.Version == "v2")
                            {
                                user.EncryptionScheme = "example-asp-identity-v2";
                            }
                            user.Factor = hashParser.Iterations;
                        }

                        if (!String.IsNullOrWhiteSpace(reader["LoginProvider"].ToString()))
                        {
                            user.IdentityProviders.Add(reader["LoginProvider"].ToString(), reader["ProviderKey"].ToString());
                        }

                        var userData = new Dictionary<string, object>
                        {
                            { "migrated", true }
                        };

                        // TODO: Add any other custom / historic / audit trail information you want to save to
                        // the data component of the FusionAuth user. 
                        var favoriteColor = reader["FavoriteColor"].ToString();
                        if (!string.IsNullOrEmpty(favoriteColor))
                        {
                            userData["favoriteColors"] = favoriteColor;
                        }
                        user.Data = userData;
                        users.Add(user);
                        currUser++; 
                    }
                }
            }
            var json = JsonConvert.SerializeObject(
                new { users = users },
                Newtonsoft.Json.Formatting.Indented,
                new JsonSerializerSettings
                {
                    ContractResolver = new CamelCasePropertyNamesContractResolver(),
                }
            );

            var filePath = "./users.json";
            if (!Directory.Exists(Path.GetDirectoryName(filePath)))
            {
                Directory.CreateDirectory(Path.GetDirectoryName(filePath));
            }
            File.WriteAllText(filePath, json);
            Console.WriteLine($"JSON output written at {filePath}.");
        }
    }
}