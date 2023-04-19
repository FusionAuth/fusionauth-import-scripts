using System;
namespace Exporter
{
	public class User
	{
        public bool Active { get; set; }
        public string BirthDate { get; set; }
        public long InsertInstance { get; set; }
        public IDictionary<string, object> Data { get; set; }
        public string Email { get; set; }
        public long? Expiry { get; set; }
        public string FirstName { get; set; }
        public string FullName { get; set; }
        public string Id { get; set; }
        public long LastLoginInstant { get; set; }
        public string LastName { get; set; }
        public string MiddleName { get; set; }
        public string MobilePhone { get; set; }
        public string Password { get; set; }
        public string Salt { get; set; }
        public int Factor { get; set; }
        public string EncryptionScheme { get; set;}
        public bool PasswordChangeRequired { get; set; }
        public long PasswordLastUpdateInstant { get; set; }
        public IEnumerable<string> PreferredLanguages { get; set; }
        public Dictionary<string, string> IdentityProviders { get; set; }
        public string Timezone { get; set; }
        public bool TwoFactorEnabled { get; set; }
        public string Username { get; set; }
        public bool Verified { get; set; }
    }
}

