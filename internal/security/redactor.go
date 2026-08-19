package security

import (
	"net/url"
	"regexp"
	"strings"
)

var (
	// Regex matching userinfo in URLs like rtsp://user:pass@host or http://user:pass@host
	urlUserInfoRegex = regexp.MustCompile(`([a-zA-Z][a-zA-Z0-9+\-.]*://)([^:@/]+):([^@/]+)@`)

	// Regex matching JSON password / secret fields
	jsonSecretRegex = regexp.MustCompile(`(?i)"(password|secret|token|encrypted_password|secret_key|credentials)":\s*"([^"]+)"`)

	// Regex matching query string passwords
	querySecretRegex = regexp.MustCompile(`(?i)(password|pwd|secret|token)=([^&]+)`)

	// Regex matching Authorization headers
	authHeaderRegex = regexp.MustCompile(`(?i)(Authorization:\s*)(Basic|Bearer|Digest)\s+[^\r\n]+`)
)

// RedactURL takes a URL string and removes sensitive user/password parts.
// e.g. "rtsp://admin:secret123@192.168.1.100:554/live" -> "rtsp://192.168.1.100:554/live"
func RedactURL(rawURL string) string {
	if rawURL == "" {
		return ""
	}

	// Try standard url.Parse first
	if u, err := url.Parse(rawURL); err == nil && u.User != nil {
		u.User = nil
		return u.String()
	}

	// Fallback to regex in case URL contains non-standard components
	return urlUserInfoRegex.ReplaceAllString(rawURL, "${1}")
}

// RedactString sanitizes credentials, passwords, tokens, and authorization headers from strings.
func RedactString(input string) string {
	if input == "" {
		return ""
	}

	s := input
	// Redact URLs with embedded passwords
	s = urlUserInfoRegex.ReplaceAllString(s, "${1}***:***@")

	// Redact Authorization headers
	s = authHeaderRegex.ReplaceAllString(s, "${1}${2} [REDACTED]")

	// Redact JSON secrets
	s = jsonSecretRegex.ReplaceAllString(s, `"$1":"[REDACTED]"`)

	// Redact Query params
	s = querySecretRegex.ReplaceAllString(s, `$1=[REDACTED]`)

	return s
}

// RedactMap creates a copy of a map with sensitive keys redacted.
func RedactMap(data map[string]interface{}) map[string]interface{} {
	if data == nil {
		return nil
	}
	result := make(map[string]interface{}, len(data))
	sensitiveKeys := map[string]bool{
		"password":           true,
		"encrypted_password": true,
		"secret":             true,
		"secret_key":         true,
		"token":              true,
		"authorization":      true,
	}

	for k, v := range data {
		lowerK := strings.ToLower(k)
		if sensitiveKeys[lowerK] {
			result[k] = "[REDACTED]"
			continue
		}
		if strVal, ok := v.(string); ok {
			result[k] = RedactString(strVal)
		} else if mapVal, ok := v.(map[string]interface{}); ok {
			result[k] = RedactMap(mapVal)
		} else {
			result[k] = v
		}
	}
	return result
}
