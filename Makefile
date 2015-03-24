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
		-e ${REGISTRY_EMAIL} \
		${REGISTRY_HOST};
	docker push ${TALOS_TESTER};

launch-aws-tests:
	./aws-tests/node_modules/.bin/babel-node -r \
			./aws-tests/launch-tests.js launch ${TALOS_TESTER};

render-aws-user-data-script:
	./aws-tests/node_modules/.bin/babel-node -r \
			./aws-tests/launch-tests.js render ${TALOS_TESTER};

# Download new results, into the new/ folder, we should manually move them there
download-new-results:
	mkdir -p results/new/;
	aws s3 sync s3://jonasfj-talos-test-results/${RESULT_PREFIX} ./results/new/ \
			--exclude "*" --include "*datazilla.json"

# Rank by stability of results
rank-configs-by-stability:
	./analysis/node_modules/.bin/babel-node -r \
			./analysis/rank-configs-by-stability;

# Rank by ability to detect regression
rank-configs-by-ability:
	./analysis/node_modules/.bin/babel-node -r \
			./analysis/rank-configs-by-ability;

install:
	cd ./analysis && npm install;

.PHONY: talos-tester debug-talos-tester check-talos-tester push-talos-tester
.PHONY: launch-aws-tests rank-configs render-aws-user-data-script
