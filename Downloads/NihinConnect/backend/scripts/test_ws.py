import asyncio
import sys
try:
    import websockets
except Exception as e:
    print('MISSING_WEBSOCKETS', e)
    sys.exit(2)

async def test():
    uri = 'ws://127.0.0.1:8000/ws/messages/'
    try:
        async with websockets.connect(uri) as ws:
            print('CONNECTED')
            try:
                await ws.send('hello')
                msg = await asyncio.wait_for(ws.recv(), timeout=2)
                print('RECV:', msg)
            except Exception as e:
                print('SEND/RECV ERROR', e)
    except Exception as e:
        print('CONNECT ERROR', repr(e))

if __name__ == '__main__':
    asyncio.run(test())
