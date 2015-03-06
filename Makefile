TALOS_TESTER:="${REGISTRY}/${TALOS_TESTER_IMAGE_NAME}:${TALOS_TESTER_IMAGE_TAG}"

INPUT_VARIABLES:=				\
	BUILD_URL            	\
	TESTS                	\
	AWS_ACCESS_KEY_ID    	\
	AWS_SECRET_ACCESS_KEY	\
	AWS_DEFAULT_REGION   	\
	RESULT_BUCKET        	\
	RESULT_PREFIX					\
	DISPLAY_SERVER       	\
	DEBUG                	\
	TITLE                	\
	BRANCH_NAME          	\
	BROWSER_PATH

talos-tester:
	docker build --no-cache -t ${TALOS_TESTER} talos-tester/;
	@echo "Built and tagged talos-tester as ${TALOS_TESTER}";

debug-talos-tester:
	@echo "docker run -ti --rm -e ... --entrypoint bash ${TALOS_TESTER}"
	@docker run \
		--name talos-tester --rm -ti \
		$(addprefix -e ,${INPUT_VARIABLES}) \
		--entrypoint bash \
		${TALOS_TESTER}

check-talos-tester:
	@echo "docker run -ti --rm -e ... ${TALOS_TESTER}"
	@ \
		BUILD_URL=`cat data/input.csv | head -n 1 | cut -d ';' -f 2` \
		RESULT_PREFIX='results/localhost' \
		docker run \
		--name talos-tester --rm -ti \
		$(addprefix -e ,${INPUT_VARIABLES}) \
		${TALOS_TESTER}

push-talos-tester:
	docker login \
		-u ${REGISTRY_USERNAME} \
		-p ${REGISTRY_PASSWORD} \
		-e ${REGISTRY_EMAIL};
	docker push ${TALOS_TESTER};

.PHONY: talos-tester debug-talos-tester check-talos-tester push-talos-tester
