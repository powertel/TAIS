from channels.generic.websocket import AsyncJsonWebsocketConsumer

class RealtimeConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        await self.accept()
        self.sensor_groups = set()
        self.transformer_groups = set()
        try:
            qs = self.scope.get('query_string', b'').decode('utf-8')
            import urllib.parse
            params = urllib.parse.parse_qs(qs)
            sids = params.get('sensor_id') or []
            tids = params.get('transformer_id') or []
            for sid in sids:
                g = f'sensor_{sid}'
                await self.channel_layer.group_add(g, self.channel_name)
                self.sensor_groups.add(g)
            for tid in tids:
                g = f'transformer_{tid}'
                await self.channel_layer.group_add(g, self.channel_name)
                self.transformer_groups.add(g)
        except Exception:
            pass

    async def disconnect(self, code):
        for g in list(self.sensor_groups):
            await self.channel_layer.group_discard(g, self.channel_name)
        for g in list(self.transformer_groups):
            await self.channel_layer.group_discard(g, self.channel_name)

    async def receive_json(self, content, **kwargs):
        try:
            cmd = content.get('cmd')
            if cmd == 'subscribe':
                sid = content.get('sensor_id')
                tid = content.get('transformer_id')
                if sid:
                    g = f'sensor_{sid}'
                    await self.channel_layer.group_add(g, self.channel_name)
                    self.sensor_groups.add(g)
                if tid:
                    g = f'transformer_{tid}'
                    await self.channel_layer.group_add(g, self.channel_name)
                    self.transformer_groups.add(g)
            elif cmd == 'unsubscribe':
                sid = content.get('sensor_id')
                tid = content.get('transformer_id')
                if sid:
                    g = f'sensor_{sid}'
                    await self.channel_layer.group_discard(g, self.channel_name)
                    self.sensor_groups.discard(g)
                if tid:
                    g = f'transformer_{tid}'
                    await self.channel_layer.group_discard(g, self.channel_name)
                    self.transformer_groups.discard(g)
        except Exception:
            pass

    async def broadcast_message(self, event):
        await self.send_json(event)