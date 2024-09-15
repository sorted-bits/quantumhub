# Docker

> **EXPERIMENTAL**

If you have additional modules you want to use, add them to your running Docker instance by using the `volumes` option and add it as a directory to the `/home/node/modules` folder. This, because by default, the `config.yaml` configures `modules_path` as `../modules`.

## Example docker compose

```
---
version: "2.1"
services:
  sabnzbd:
    image: sortedbit/quantumhub:latest
    container_name: quantumhub
    volumes:
      - /your/config/config.yaml:/home/node/app/config.yaml
      - /an/extra/module:/home/node/modules/modbus-solarman
    restart: always

networks:
  inet:
    name: inet
    external: true
```
