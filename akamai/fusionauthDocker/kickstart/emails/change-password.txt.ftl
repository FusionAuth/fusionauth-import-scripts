[#setting url_escaping_charset="UTF-8"]
To change your password click on the following link.

[#-- The optional 'state' map provided on the Forgot Password API call is exposed in the template as 'state' --]
[#assign url = "http://localhost:9011/password/change/${changePasswordId}?tenantId=${user.tenantId}" /]
[#list state!{} as key, value][#if key != "tenantId" && value??][#assign url = url + "&" + key?url + "=" + value?url/][/#if][/#list]

${url}

- FusionAuth Admin
