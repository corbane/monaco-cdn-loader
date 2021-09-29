
install:
	pnpm install --offline

install-online:
	pnpm install

build:
	@make -C core build
	@make -C demos/simple build
	@make -C demos/default build
	
pack:
	@make -C core build
	pnpm pack --pack-destination dist