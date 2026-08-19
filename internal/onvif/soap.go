package onvif

import (
	"crypto/rand"
	"crypto/sha1"
	"encoding/base64"
	"fmt"
	"time"
)

// buildWSSecurityHeader generates the WS-Security header with UsernameToken PasswordDigest.
func buildWSSecurityHeader(username, password string) string {
	if username == "" {
		return ""
	}

	nonceBytes := make([]byte, 16)
	_, _ = rand.Read(nonceBytes)
	createdStr := time.Now().UTC().Format(time.RFC3339Nano)

	// Digest = Base64(SHA1(nonce + created + password))
	h := sha1.New()
	h.Write(nonceBytes)
	h.Write([]byte(createdStr))
	h.Write([]byte(password))
	digest := base64.StdEncoding.EncodeToString(h.Sum(nil))
	nonceB64 := base64.StdEncoding.EncodeToString(nonceBytes)

	return fmt.Sprintf(`
    <wsse:Security xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd" xmlns:wsu="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd">
      <wsse:UsernameToken>
        <wsse:Username>%s</wsse:Username>
        <wsse:Password Type="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-username-token-profile-1.0#PasswordDigest">%s</wsse:Password>
        <wsse:Nonce EncodingType="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-soap-message-security-1.0#Base64Binary">%s</wsse:Nonce>
        <wsu:Created>%s</wsu:Created>
      </wsse:UsernameToken>
    </wsse:Security>`, escapeXML(username), digest, nonceB64, createdStr)
}

// wrapSOAPEnvelope builds a full SOAP 1.2 / ONVIF envelope around a body payload.
func wrapSOAPEnvelope(username, password, bodyXML string) string {
	secHeader := buildWSSecurityHeader(username, password)
	return fmt.Sprintf(`<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope"
               xmlns:tds="http://www.onvif.org/ver10/device/wsdl"
               xmlns:trt="http://www.onvif.org/ver10/media/wsdl"
               xmlns:tptz="http://www.onvif.org/ver20/ptz/wsdl"
               xmlns:tt="http://www.onvif.org/ver10/schema">
  <soap:Header>%s</soap:Header>
  <soap:Body>%s</soap:Body>
</soap:Envelope>`, secHeader, bodyXML)
}

func escapeXML(s string) string {
	s = replace(s, "&", "&amp;")
	s = replace(s, "<", "&lt;")
	s = replace(s, ">", "&gt;")
	s = replace(s, "\"", "&quot;")
	s = replace(s, "'", "&apos;")
	return s
}

func replace(s, old, newStr string) string {
	var res string
	for i := 0; i < len(s); {
		if i+len(old) <= len(s) && s[i:i+len(old)] == old {
			res += newStr
			i += len(old)
		} else {
			res += string(s[i])
			i++
		}
	}
	return res
}
