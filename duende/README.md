## Duende

This lets you export hashes from Duende Identity Server.

Make sure you modify `identity-server-export/Exporter/Program.cs` to account for any custom user attributes. Search for `FavoriteColor` and modify those lines as needed. If you are not migrating any custom attributes, you may remove that code.

See http://localhost:4000/docs/v1/tech/migration-guide/duende for full instructions.
