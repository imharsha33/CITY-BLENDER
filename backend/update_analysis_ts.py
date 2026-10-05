import os

analysis_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'src', 'types', 'analysis.ts'))

with open(analysis_path, 'r', encoding='utf-8') as f:
    content = f.read()

if 'DevelopmentZone' not in content:
    content = "import type { DevelopmentZone } from './geo';\n" + content
    content = content.replace(
        'issues: InfrastructureIssue[];',
        'issues: InfrastructureIssue[];\n  developmentZones?: DevelopmentZone[];'
    )

with open(analysis_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("analysis.ts updated!")
