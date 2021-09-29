
install:
	pnpm install --offline

install-online:
	pnpm install

build:
	@ make -C core build
	@ make -C demos/simple build 
	@ make -C demos/default build
	
pack:
	@ make -C core build
	pnpm pack --pack-destination dist

watch-core:
	@ make -C core watch

watch-demos:
	& make -C demos/simple watch \
	& make -C demos/default watch

watch-all:
	@ make -C core watch \
	& make -C demos/simple watch \
	& make -C demos/default watch
