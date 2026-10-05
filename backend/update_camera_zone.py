import os

base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'src', 'engine'))

# 1. Update cameraController.ts
cam_path = os.path.join(base_dir, 'cameraController.ts')
with open(cam_path, 'r', encoding='utf-8') as f:
    cam_content = f.read()

cam_content = cam_content.replace(
    "viewType: 'road' | 'junction' | 'bottleneck' | 'spine' = 'road'",
    "viewType: 'road' | 'junction' | 'bottleneck' | 'spine' | 'zone' = 'road'"
)

if "'zone'" not in cam_content:
    cam_content = cam_content.replace(
        "    } else if (viewType === 'spine') {",
        "    } else if (viewType === 'zone') {\n      altitude = 160;\n      offsetZ = 170;\n      offsetX = 55;\n    } else if (viewType === 'spine') {"
    )

with open(cam_path, 'w', encoding='utf-8') as f:
    f.write(cam_content)

# 2. Update sceneManager.ts
sm_path = os.path.join(base_dir, 'sceneManager.ts')
with open(sm_path, 'r', encoding='utf-8') as f:
    sm_content = f.read()

sm_content = sm_content.replace(
    "viewType: 'road' | 'junction' | 'bottleneck' | 'spine' = 'road'",
    "viewType: 'road' | 'junction' | 'bottleneck' | 'spine' | 'zone' = 'road'"
)

with open(sm_path, 'w', encoding='utf-8') as f:
    f.write(sm_content)

print("cameraController.ts and sceneManager.ts updated with 'zone' viewType!")
