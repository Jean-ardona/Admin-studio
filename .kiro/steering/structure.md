# Structure
- /src/app: studio screens (import, models, roles, preview, export)
- /src/lib/parser: Prisma schema to SchemaModel
- /src/lib/generator: StudioConfig to list of files
- /src/lib/generator/templates: one template per generated file kind
- /src/lib/kiro: generates .kiro steering and skills for the output
- /src/demo: the two example schemas