# Fleet model Vehicles zero-count form — FLEET-MODEL-VEHICLES-CREATE-001

This bounded slice implements the zero-count branch of Odoo
fleet.vehicle.model.action_model_vehicle: opening the model stat action for
a model with no vehicles presents a New Vehicle form with the model selected
by default_model_id.

Source revision: 659759969d535d286b656c96b675e4612b925ddd (65975996).

- Source: /home/nhanjs/projects/odoo/addons/fleet/views/fleet_vehicle_model_views.xml
- Source method: /home/nhanjs/projects/odoo/addons/fleet/models/fleet_vehicle_model.py
- Core3 page/API seam: services/fleet/pages/model-detail.yaml and
  services/fleet/api/model-detail.yaml
- Durable fixture: services/fleet/migrations/20260922180000-052-fleet-model-vehicle-create-data.yaml

The action is YAML-first and transactional: vehicle insert, model relation,
model-derived fields, and model count update commit together. BrowserSkill was
attempted once but the existing Odoo tab was already borrowed by another
session; no visual-parity claim is made.
