from django.core.management.base import BaseCommand
from api.models import Device, Region, Depot, Transformer
import os
import re
import requests


class Command(BaseCommand):
    help = "Sync LORIOT devices to Device table"

    def add_arguments(self, parser):
        parser.add_argument('--base-url', type=str, default=os.getenv('LORIOT_API_BASE_URL', ''))
        parser.add_argument('--app-id', type=str, default=os.getenv('LORIOT_APP_ID', ''))
        parser.add_argument('--token', type=str, default=os.getenv('LORIOT_API_TOKEN', ''))

    def handle(self, *args, **options):
        base_url = (options.get('base_url') or '').rstrip('/')
        app_id = options.get('app_id') or ''
        token = options.get('token') or ''
        if not base_url or not app_id or not token:
            self.stderr.write(self.style.ERROR('Missing base-url, app-id or token'))
            return
        url = f"{base_url}/apps/{app_id}/devices"
        headers = {'Authorization': f'Bearer {token}'}
        try:
            resp = requests.get(url, headers=headers, timeout=30)
        except Exception as e:
            self.stderr.write(self.style.ERROR(str(e)))
            return
        if resp.status_code != 200:
            self.stderr.write(self.style.ERROR(f"HTTP {resp.status_code}"))
            return
        try:
            data = resp.json()
        except Exception:
            self.stderr.write(self.style.ERROR('Invalid JSON'))
            return
        items = []
        if isinstance(data, dict) and 'devices' in data:
            items = data.get('devices') or []
        elif isinstance(data, list):
            items = data
        created = 0
        updated = 0
        skipped = 0
        region, _ = Region.objects.get_or_create(name='Unassigned')
        depot, _ = Depot.objects.get_or_create(name='Unassigned Depot', region=region)
        transformer, _ = Transformer.objects.get_or_create(transformer_id='UNASSIGNED', defaults={'name': 'Unassigned Transformer', 'region': region, 'depot': depot, 'capacity': 0})
        for item in items:
            deveui = None
            if isinstance(item, dict):
                for k in ['devEui', 'deveui', 'DevEUI', 'EUI', 'eui', 'id', 'deviceId']:
                    v = item.get(k)
                    if isinstance(v, str) and v.strip():
                        deveui = v.strip()
                        break
            if not deveui or not re.fullmatch(r'[0-9A-Fa-f]{16,32}', deveui):
                skipped += 1
                continue
            defaults = {'name': (item.get('name') if isinstance(item, dict) else None) or deveui}
            device, was_created = Device.objects.get_or_create(deveui=deveui, defaults=defaults)
            if device.transformer_id is None:
                device.transformer = transformer
            meta = device.metadata or {}
            if isinstance(item, dict):
                meta['loriot'] = item
            device.metadata = meta
            if was_created:
                created += 1
            else:
                updated += 1
            device.save()
        self.stdout.write(self.style.SUCCESS(f"Synced devices: total={len(items)} created={created} updated={updated} skipped={skipped}"))