# Makefile for VideoCMS

SHELL := /bin/bash
PROJECT_ROOT := $(CURDIR)
export PATH := $(PROJECT_ROOT)/.tools/node/bin:$(PATH)

.PHONY: all dev backend frontend build test lint clean docker-build docker-up docker-down docker-logs help

all: build

help:
	@echo "VideoCMS - Comandos disponíveis:"
	@echo "  make dev          - Compila e inicia o servidor backend na porta 15000"
	@echo "  make backend      - Compila o binário do backend Go em ./bin/cms"
	@echo "  make frontend     - Compila os arquivos estáticos do frontend em ./web/dist"
	@echo "  make build        - Compila o frontend e o backend completo"
	@echo "  make test         - Executa todos os testes unitários e de integração Go"
	@echo "  make lint         - Executa validações de lint no Go e no TypeScript"
	@echo "  make clean        - Remove binários e artefatos de build gerados no projeto"
	@echo "  make docker-build - Constrói a imagem Docker oficial do VideoCMS"
	@echo "  make docker-up    - Inicia o VideoCMS via Docker Compose em background"
	@echo "  make docker-down  - Para os containers do VideoCMS (preservando volumes)"
	@echo "  make docker-logs  - Acompanha os logs em tempo real do container"

dev: build
	@echo "Iniciando VideoCMS em http://localhost:15000..."
	./bin/cms

backend:
	@echo "Compilando backend Go..."
	@mkdir -p bin
	go build -ldflags="-s -w" -o bin/cms ./cmd/server

frontend:
	@echo "Compilando frontend React/TypeScript..."
	cd web && npm run build

build: frontend backend
	@echo "Build completo gerado com sucesso em ./bin/cms e ./web/dist."

test:
	@echo "Executando testes unitários e de integração Go..."
	go test -v -race ./...

lint:
	@echo "Executando go vet..."
	go vet ./...
	@echo "Executando verificação de tipos TypeScript..."
	cd web && npm run lint

clean:
	@echo "Limpando artefatos gerados..."
	rm -rf bin/ web/dist/ *.sqlite *.db test_*.sqlite
	@echo "Limpeza concluída."

docker-build:
	@echo "Construindo imagem Docker..."
	docker build -t videocms:latest .

docker-up:
	@echo "Iniciando VideoCMS via Docker Compose..."
	docker compose up -d

docker-down:
	@echo "Parando containers VideoCMS (volumes preservados)..."
	docker compose down

docker-logs:
	@echo "Acompanhando logs do container VideoCMS..."
	docker compose logs -f cms
