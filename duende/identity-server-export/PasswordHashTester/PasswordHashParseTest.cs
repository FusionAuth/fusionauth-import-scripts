using System.Security.Policy;
using Exporter;
using Microsoft.AspNetCore.Cryptography.KeyDerivation;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Options;
namespace PasswordHashTester;

[TestClass]
public class PasswordHashParseTest
{
    [TestMethod]
    public void TestV3()
    {
        string hashV3 = "AQAAAAEAACcQAAAAEPOWUjkBBjnBkT/oFFjsx0EdDCjFhGopC7jS4lWP2FSYdMxbkneSGyQ/OvRHUIegxg==";

        PasswordHashParser parser = new PasswordHashParser(hashV3);

        Assert.AreEqual("v3", parser.Version);
        Assert.AreEqual(KeyDerivationPrf.HMACSHA256, parser.Algorithm);
        Assert.AreEqual(10000, parser.Iterations);
        Assert.AreEqual("85ZSOQEGOcGRP+gUWOzHQQ==", parser.Salt);
        Assert.AreEqual("HQwoxYRqKQu40uJVj9hUmHTMW5J3khskPzr0R1CHoMY=", parser.Hash);
    }

    [TestMethod]
    public void TestV2()
    {
        // original password was "Pa$$w0rd"
        string hashV2 = "AOpHWX+WEzHPkznrDx904KLk8h2yCbTiiBYVdskTN/1ToeEupAlY8/zSsH33zUsjBg==";

        PasswordHashParser parser = new PasswordHashParser(hashV2);

        Assert.AreEqual("v2", parser.Version);
        Assert.AreEqual(KeyDerivationPrf.HMACSHA1, parser.Algorithm);
        Assert.AreEqual(1000, parser.Iterations);
        Assert.AreEqual("6kdZf5YTMc+TOesPH3Tgog==", parser.Salt);
        Assert.AreEqual("5PIdsgm04ogWFXbJEzf9U6HhLqQJWPP80rB9981LIwY=", parser.Hash);
    }

    
    public void CreateV2Hash()
    {
        var options = Options.Create(new PasswordHasherOptions()
        {
            CompatibilityMode = PasswordHasherCompatibilityMode.IdentityV2
        });
        var hasher = new PasswordHasher<TestUser>(options);
        var user = new TestUser();

        var hash = hasher.HashPassword(user, "Pa$$w0rd");
        Console.WriteLine("V2 Hash: " + hash);
    }

    public void HashAndCompare()
    {
        var options = Options.Create(new PasswordHasherOptions()
        {
            CompatibilityMode = PasswordHasherCompatibilityMode.IdentityV2
        });
        var hasher = new PasswordHasher<TestUser>(options);
        var user = new TestUser();

        string hashV3 = "AQAAAAEAACcQAAAAEHRYpQZ06ZDGgeTZzxhGgU6Ri/KWiPOc76ss5mb5jSvernZoWu0jAm5wClljwcX/CQ==";
        string plaintextPassword = "Pass123$";

        var result = hasher.VerifyHashedPassword(user, hashV3, plaintextPassword);
        Console.WriteLine("Hash Test: " + result);
    }
}

public class TestUser
{
    public TestUser()
    {

    }

    public string Name { get; set; }
    public string LastName { get; set; }
}
