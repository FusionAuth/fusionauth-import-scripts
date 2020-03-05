## FusionAuth Import Scripts

We're building out import scripts for any and all third party Identity Providers. Feel free to submit a PR with your specific use of the Import API in whatever language you have. 

### Importers

#### Auth0

To begin, modify the section that begins with ` BEGIN Modify these variables for your Import`. Once you have provided a URL and API key, and the location of the exported Auth0 files, you may execute the import script.

```bash
ruby ./import.rb
```

### Project Layout

```
auth0
├── import.rb
```