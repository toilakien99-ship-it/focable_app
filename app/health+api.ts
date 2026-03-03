export function GET(): Response {
  return Response.json(
    {
      status: 'ok',
      app: 'Focable',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    },
    { status: 200 }
  );
}
