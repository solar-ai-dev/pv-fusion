pipeline {
    agent any

    options {
        disableConcurrentBuilds()
        timeout(time: 45, unit: 'MINUTES')
        buildDiscarder(logRotator(numToKeepStr: '20'))
        timestamps()
    }

    parameters {
        booleanParam(
            name: 'ENABLE_ECR_PUSH',
            defaultValue: false,
            description: '湲곕낯媛믪? false?낅땲?? main 釉뚮옖移섏뿉?쒕쭔 ECR push 寃쎈줈瑜??덉슜?⑸땲??'
        )
    }

    environment {
        AWS_REGION = 'ap-northeast-2'
        ECR_ALLOWED_BRANCH = 'main'
        K8S_NAMESPACE = 'pv-insight'
        FRONTEND_REPOSITORY = 'pv-insight-frontend'
        BACKEND_REPOSITORY = 'pv-insight-backend'
        AI_WORKER_REPOSITORY = 'pv-insight-ai-worker'
        FRONTEND_DEPLOYMENT = 'pv-insight-frontend'
        BACKEND_DEPLOYMENT = 'pv-insight-backend'
        AI_WORKER_DEPLOYMENT = 'pv-insight-ai-worker'
        FRONTEND_CONTAINER = 'frontend'
        BACKEND_CONTAINER = 'backend'
        AI_WORKER_CONTAINER = 'ai-worker'
        FRONTEND_BUILD_ARG_API_BASE_URL = '/api/v1'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Resolve Build Metadata') {
            steps {
                script {
                    env.GIT_COMMIT_SHA = sh(script: 'git rev-parse HEAD', returnStdout: true).trim()

                    def rawBranchName = (env.BRANCH_NAME?.trim())
                        ?: (env.GIT_BRANCH?.trim())
                        ?: sh(
                            script: '''
                                git branch -r --contains HEAD \
                                  | sed 's#^[ *]*origin/##' \
                                  | grep -E '^(main|develop)$' \
                                  | head -1
                            ''',
                            returnStdout: true
                        ).trim()

                    env.GIT_BRANCH_NAME = rawBranchName
                        .replaceFirst(/^origin\//, '')
                        .replaceFirst(/^refs\/heads\//, '')

                    if (!env.GIT_BRANCH_NAME?.trim()) {
                        env.GIT_BRANCH_NAME = 'HEAD'
                    }

                    env.FRONTEND_LOCAL_IMAGE = "${env.FRONTEND_REPOSITORY}:${env.GIT_COMMIT_SHA}"
                    env.BACKEND_LOCAL_IMAGE = "${env.BACKEND_REPOSITORY}:${env.GIT_COMMIT_SHA}"
                    env.AI_WORKER_LOCAL_IMAGE = "${env.AI_WORKER_REPOSITORY}:${env.GIT_COMMIT_SHA}"
                    env.ECR_PUSH_BRANCH_ALLOWED = (env.GIT_BRANCH_NAME == env.ECR_ALLOWED_BRANCH).toString()
                    env.ECR_PUSH_ACTIVE = (params.ENABLE_ECR_PUSH && env.GIT_BRANCH_NAME == env.ECR_ALLOWED_BRANCH).toString()
                    env.K3S_ROLLOUT_ACTIVE = env.ECR_PUSH_ACTIVE
                }

                echo "Git Commit SHA: ${env.GIT_COMMIT_SHA}"
                echo "Branch Name: ${env.GIT_BRANCH_NAME}"
                echo "Frontend Image: ${env.FRONTEND_LOCAL_IMAGE}"
                echo "Backend Image: ${env.BACKEND_LOCAL_IMAGE}"
                echo "AI Worker Image: ${env.AI_WORKER_LOCAL_IMAGE}"
                echo "ECR Push Requested: ${params.ENABLE_ECR_PUSH}"
                echo "ECR Push Branch Allowed: ${env.ECR_PUSH_BRANCH_ALLOWED}"
                echo "ECR Push Active: ${env.ECR_PUSH_ACTIVE}"
            }
        }

        stage('Validate Build Environment') {
            steps {
                sh 'git --version'
                sh 'docker --version'
                sh 'node --version'
                sh 'npm --version'
                sh 'java -version'
                sh 'python3 --version'
                sh 'test -f frontend/package-lock.json'
                sh 'test -f frontend/Dockerfile'
                sh 'test -f backend/Dockerfile'
                sh 'test -f backend/gradlew'
                sh 'test -f ai-worker/requirements.txt'
                sh 'test -f ai-worker/Dockerfile'
                script {
                    if (params.ENABLE_ECR_PUSH && env.GIT_BRANCH_NAME != env.ECR_ALLOWED_BRANCH) {
                        echo "ECR push is disabled on branch '${env.GIT_BRANCH_NAME}'. Allowed branch: '${env.ECR_ALLOWED_BRANCH}'."
                    }
                }
            }
        }

        stage('Frontend Test/Build') {
            steps {
                dir('frontend') {
                    sh 'npm ci'
                    sh 'npm run lint'
                    sh 'npm run typecheck'
                    sh 'npm run build'
                }
            }
        }

        stage('Backend Test/Build') {
            steps {
                dir('backend') {
                    sh './gradlew test bootJar --no-daemon'
                }
            }
        }

        stage('AI Worker Test') {
            steps {
                dir('ai-worker') {
                    sh '''
                        python3 -m venv .venv-ci
                        . .venv-ci/bin/activate
                        python -m pip install --upgrade pip
                        python -m pip install -r requirements.txt
                        PYTHONPATH=. pytest
                    '''
                }
            }
        }

        stage('Docker Build') {
            steps {
                dir('frontend') {
                    sh "docker build --build-arg VITE_API_BASE_URL=${env.FRONTEND_BUILD_ARG_API_BASE_URL} -t ${env.FRONTEND_LOCAL_IMAGE} ."
                }
                dir('backend') {
                    sh "docker build -t ${env.BACKEND_LOCAL_IMAGE} ."
                }
                dir('ai-worker') {
                    sh "docker build -t ${env.AI_WORKER_LOCAL_IMAGE} ."
                }
            }
        }

        stage('Image Metadata Summary') {
            steps {
                echo "Frontend local image: ${env.FRONTEND_LOCAL_IMAGE}"
                echo "Backend local image: ${env.BACKEND_LOCAL_IMAGE}"
                echo "AI Worker local image: ${env.AI_WORKER_LOCAL_IMAGE}"
                echo "ECR repositories: ${env.FRONTEND_REPOSITORY}, ${env.BACKEND_REPOSITORY}, ${env.AI_WORKER_REPOSITORY}"
                echo "ECR region: ${env.AWS_REGION}"
                echo "K3s deployment stage included: ${env.K3S_ROLLOUT_ACTIVE}"
            }
        }

        stage('Optional ECR Push') {
            when {
                expression {
                    return params.ENABLE_ECR_PUSH && env.GIT_BRANCH_NAME == env.ECR_ALLOWED_BRANCH
                }
            }
            steps {
                sh '''
                    set -eu

                    aws --version
                    ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text)"
                    ECR_REGISTRY="${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

                    aws ecr describe-repositories --repository-names "${FRONTEND_REPOSITORY}" >/dev/null
                    aws ecr describe-repositories --repository-names "${BACKEND_REPOSITORY}" >/dev/null
                    aws ecr describe-repositories --repository-names "${AI_WORKER_REPOSITORY}" >/dev/null

                    aws ecr get-login-password --region "${AWS_REGION}" | docker login --username AWS --password-stdin "${ECR_REGISTRY}"

                    docker tag "${FRONTEND_LOCAL_IMAGE}" "${ECR_REGISTRY}/${FRONTEND_REPOSITORY}:${GIT_COMMIT_SHA}"
                    docker tag "${BACKEND_LOCAL_IMAGE}" "${ECR_REGISTRY}/${BACKEND_REPOSITORY}:${GIT_COMMIT_SHA}"
                    docker tag "${AI_WORKER_LOCAL_IMAGE}" "${ECR_REGISTRY}/${AI_WORKER_REPOSITORY}:${GIT_COMMIT_SHA}"

                    docker push "${ECR_REGISTRY}/${FRONTEND_REPOSITORY}:${GIT_COMMIT_SHA}"
                    docker push "${ECR_REGISTRY}/${BACKEND_REPOSITORY}:${GIT_COMMIT_SHA}"
                    docker push "${ECR_REGISTRY}/${AI_WORKER_REPOSITORY}:${GIT_COMMIT_SHA}"
                '''
            }
        }

        stage('K3s Rollout') {
            when {
                expression {
                    return params.ENABLE_ECR_PUSH && env.GIT_BRANCH_NAME == env.ECR_ALLOWED_BRANCH
                }
            }
            steps {
                sh '''
                    set -eu

                    ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text)"
                    ECR_REGISTRY="${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

                    set +x
                    ECR_LOGIN_PASSWORD="$(aws ecr get-login-password --region "${AWS_REGION}")"
                    kubectl -n "${K8S_NAMESPACE}" create secret docker-registry ecr-pull-secret \
                      --docker-server="${ECR_REGISTRY}" \
                      --docker-username=AWS \
                      --docker-password="${ECR_LOGIN_PASSWORD}" \
                      --dry-run=client -o yaml | kubectl apply -f -
                    unset ECR_LOGIN_PASSWORD

                    kubectl -n "${K8S_NAMESPACE}" patch serviceaccount default \
                      --type=merge \
                      -p '{"imagePullSecrets":[{"name":"ecr-pull-secret"}]}'

                    kubectl -n "${K8S_NAMESPACE}" set image deployment/"${FRONTEND_DEPLOYMENT}" \
                      "${FRONTEND_CONTAINER}"="${ECR_REGISTRY}/${FRONTEND_REPOSITORY}:${GIT_COMMIT_SHA}"
                    kubectl -n "${K8S_NAMESPACE}" set image deployment/"${BACKEND_DEPLOYMENT}" \
                      "${BACKEND_CONTAINER}"="${ECR_REGISTRY}/${BACKEND_REPOSITORY}:${GIT_COMMIT_SHA}"
                    kubectl -n "${K8S_NAMESPACE}" set image deployment/"${AI_WORKER_DEPLOYMENT}" \
                      "${AI_WORKER_CONTAINER}"="${ECR_REGISTRY}/${AI_WORKER_REPOSITORY}:${GIT_COMMIT_SHA}"

                    kubectl -n "${K8S_NAMESPACE}" rollout status deployment/"${FRONTEND_DEPLOYMENT}" --timeout=120s
                    kubectl -n "${K8S_NAMESPACE}" rollout status deployment/"${BACKEND_DEPLOYMENT}" --timeout=120s
                    kubectl -n "${K8S_NAMESPACE}" rollout status deployment/"${AI_WORKER_DEPLOYMENT}" --timeout=180s

                    echo "K3s rollout summary"
                    echo "Namespace: ${K8S_NAMESPACE}"
                    echo "Branch: ${GIT_BRANCH_NAME}"
                    echo "Git SHA: ${GIT_COMMIT_SHA}"
                    echo "Frontend image: ${ECR_REGISTRY}/${FRONTEND_REPOSITORY}:${GIT_COMMIT_SHA}"
                    echo "Backend image: ${ECR_REGISTRY}/${BACKEND_REPOSITORY}:${GIT_COMMIT_SHA}"
                    echo "AI Worker image: ${ECR_REGISTRY}/${AI_WORKER_REPOSITORY}:${GIT_COMMIT_SHA}"
                '''
            }
        }
    }

    post {
        always {
            echo "Pipeline complete. Commit SHA: ${env.GIT_COMMIT_SHA ?: 'unresolved'}"
        }
    }
}
