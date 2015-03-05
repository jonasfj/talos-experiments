FROM          ubuntu:trusty
MAINTAINER    Jonas Finnemann Jensen <jopsen@gmail.com>

# Add utilities and configuration
ADD           run-datazilla.sh      /root/run-datazilla.sh
ADD           run-mysql.sh          /root/run-mysql.sh
ADD           package.json          /root/package.json
ADD           load-data.js          /root/load-data.js
ADD           date-extends.js       /root/date-extends.js

# Install dependencies
RUN     DEBIAN_FRONTEND=noninteractive apt-get update \
    &&  apt-get upgrade -y \
    &&  apt-get install -y \
          rsyslog \
          ca-certificates \
          tar nano sudo screen vim wget curl rlwrap \
          nodejs nodejs-legacy npm jq \
          git mercurial unzip zip build-essential \
          python-dev python-pip python-scipy python-numpy \
          libblas-dev liblapack-dev libatlas-base-dev gfortran \
          mysql-server libmysqlclient-dev \
          memcached \
    &&  rm -rf /var/lib/mysql/mysql \
    &&  pip install awscli \
    &&  cd /root/ \
    &&  npm install \
    &&  apt-get clean
RUN     git clone https://github.com/mozilla/datazilla.git /root/datazilla \
    &&  cd /root/datazilla \
    &&  pip install -r requirements/compiled.txt


EXPOSE        3306
EXPOSE        9090

# Set entry point that will download input and launch display server
ENTRYPOINT    ["/root/run-datazilla.sh"]
