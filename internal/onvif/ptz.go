package onvif

import (
	"context"
	"encoding/xml"
	"fmt"
)

// PTZPreset represents a PTZ position preset.
type PTZPreset struct {
	Token string `json:"token"`
	Name  string `json:"name"`
}

// PTZController defines interface for Pan-Tilt-Zoom operations.
type PTZController interface {
	ContinuousMove(ctx context.Context, profileToken string, panSpeed, tiltSpeed, zoomSpeed float64) error
	Stop(ctx context.Context, profileToken string) error
	AbsoluteMove(ctx context.Context, profileToken string, pan, tilt, zoom float64) error
	RelativeMove(ctx context.Context, profileToken string, pan, tilt, zoom float64) error
	GetPresets(ctx context.Context, profileToken string) ([]PTZPreset, error)
	GotoPreset(ctx context.Context, profileToken, presetToken string) error
}

// ONVIFPTZ implements PTZController using standard ONVIF PTZ SOAP service.
type ONVIFPTZ struct {
	client  *Client
	ptzAddr string
}

// NewONVIFPTZ creates a new ONVIFPTZ instance.
func NewONVIFPTZ(client *Client, ptzAddr string) *ONVIFPTZ {
	return &ONVIFPTZ{
		client:  client,
		ptzAddr: ptzAddr,
	}
}

// ContinuousMove sends continuous Pan/Tilt/Zoom velocity commands.
func (p *ONVIFPTZ) ContinuousMove(ctx context.Context, profileToken string, panSpeed, tiltSpeed, zoomSpeed float64) error {
	body := fmt.Sprintf(`<tptz:ContinuousMove>
    <tptz:ProfileToken>%s</tptz:ProfileToken>
    <tptz:Velocity>
      <tt:PanTilt x="%f" y="%f" space="http://www.onvif.org/ver10/tptz/PanTiltSpaces/VelocityGenericSpace"/>
      <tt:Zoom x="%f" space="http://www.onvif.org/ver10/tptz/ZoomSpaces/VelocityGenericSpace"/>
    </tptz:Velocity>
  </tptz:ContinuousMove>`, escapeXML(profileToken), panSpeed, tiltSpeed, zoomSpeed)
	action := "http://www.onvif.org/ver20/ptz/wsdl/ContinuousMove"

	_, err := p.client.SendSOAP(ctx, p.ptzAddr, action, body)
	return err
}

// Stop halts all active PTZ movements.
func (p *ONVIFPTZ) Stop(ctx context.Context, profileToken string) error {
	body := fmt.Sprintf(`<tptz:Stop>
    <tptz:ProfileToken>%s</tptz:ProfileToken>
    <tptz:PanTilt>true</tptz:PanTilt>
    <tptz:Zoom>true</tptz:Zoom>
  </tptz:Stop>`, escapeXML(profileToken))
	action := "http://www.onvif.org/ver20/ptz/wsdl/Stop"

	_, err := p.client.SendSOAP(ctx, p.ptzAddr, action, body)
	return err
}

// AbsoluteMove moves PTZ to specific absolute coordinates.
func (p *ONVIFPTZ) AbsoluteMove(ctx context.Context, profileToken string, pan, tilt, zoom float64) error {
	body := fmt.Sprintf(`<tptz:AbsoluteMove>
    <tptz:ProfileToken>%s</tptz:ProfileToken>
    <tptz:Position>
      <tt:PanTilt x="%f" y="%f"/>
      <tt:Zoom x="%f"/>
    </tptz:Position>
  </tptz:AbsoluteMove>`, escapeXML(profileToken), pan, tilt, zoom)
	action := "http://www.onvif.org/ver20/ptz/wsdl/AbsoluteMove"

	_, err := p.client.SendSOAP(ctx, p.ptzAddr, action, body)
	return err
}

// RelativeMove moves PTZ relative to current position.
func (p *ONVIFPTZ) RelativeMove(ctx context.Context, profileToken string, pan, tilt, zoom float64) error {
	body := fmt.Sprintf(`<tptz:RelativeMove>
    <tptz:ProfileToken>%s</tptz:ProfileToken>
    <tptz:Translation>
      <tt:PanTilt x="%f" y="%f"/>
      <tt:Zoom x="%f"/>
    </tptz:Translation>
  </tptz:RelativeMove>`, escapeXML(profileToken), pan, tilt, zoom)
	action := "http://www.onvif.org/ver20/ptz/wsdl/RelativeMove"

	_, err := p.client.SendSOAP(ctx, p.ptzAddr, action, body)
	return err
}

// GetPresets retrieves list of PTZ presets configured in the camera.
func (p *ONVIFPTZ) GetPresets(ctx context.Context, profileToken string) ([]PTZPreset, error) {
	body := fmt.Sprintf(`<tptz:GetPresets>
    <tptz:ProfileToken>%s</tptz:ProfileToken>
  </tptz:GetPresets>`, escapeXML(profileToken))
	action := "http://www.onvif.org/ver20/ptz/wsdl/GetPresets"

	respBytes, err := p.client.SendSOAP(ctx, p.ptzAddr, action, body)
	if err != nil {
		return nil, err
	}

	type RawPreset struct {
		Token string `xml:"token,attr"`
		Name  string `xml:"Name"`
	}
	type GetPresetsResponse struct {
		Presets []RawPreset `xml:"Body>GetPresetsResponse>Preset"`
	}

	var parsed GetPresetsResponse
	if err := xml.Unmarshal(respBytes, &parsed); err != nil {
		return nil, err
	}

	var presets []PTZPreset
	for _, pr := range parsed.Presets {
		presets = append(presets, PTZPreset{
			Token: pr.Token,
			Name:  pr.Name,
		})
	}
	return presets, nil
}

// GotoPreset moves camera to a stored preset position.
func (p *ONVIFPTZ) GotoPreset(ctx context.Context, profileToken, presetToken string) error {
	body := fmt.Sprintf(`<tptz:GotoPreset>
    <tptz:ProfileToken>%s</tptz:ProfileToken>
    <tptz:PresetToken>%s</tptz:PresetToken>
  </tptz:GotoPreset>`, escapeXML(profileToken), escapeXML(presetToken))
	action := "http://www.onvif.org/ver20/ptz/wsdl/GotoPreset"

	_, err := p.client.SendSOAP(ctx, p.ptzAddr, action, body)
	return err
}
