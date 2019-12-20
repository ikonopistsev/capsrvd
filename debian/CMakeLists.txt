cmake_minimum_required(VERSION 3.0.2)

file(READ "../version.txt" FILE_VER)
file(READ "../revision.txt" FILE_REV)

# менять верисю пакета тут
project(capsrvd VERSION ${FILE_VER})

install(FILES ../capsrvd DESTINATION bin)
install(FILES ../capsrvd.conf.json.example DESTINATION /etc/capsrvd)
install(FILES ../gentoo/index.js DESTINATION /usr/lib/capsrvd)
install(FILES ../logrotate/capsrvd DESTINATION /usr/share/capsrvd)
install(FILES ../keep DESTINATION /var/log/capsrvd)
install(FILES ../systemd/capsrvd.service DESTINATION /etc/systemd/system)

set (CPACK_DEBIAN_PACKAGE_CONTROL_EXTRA ${CMAKE_CURRENT_SOURCE_DIR}/postinst;${CMAKE_CURRENT_SOURCE_DIR}/postrm;${CMAKE_CURRENT_SOURCE_DIR}/prerm)
#настройки cpack'a
set(CPACK_PACKAGE_VENDOR "LLC Bridge-Technology")
set(CPACK_PACKAGE_DESCRIPTION_SUMMARY "capsrvd server")
set(CPACK_PACKAGE_CONTACT "ikonopistsev@jsuff.com")

set(CPACK_GENERATOR "DEB")
set(CPACK_DEBIAN_PACKAGE_MAINTAINER "ikonopistsev")
set(CPACK_DEBIAN_PACKAGE_SECTION main)
set(CPACK_PACKAGE_NAME ${PROJECT_NAME})
set(CPACK_DEBIAN_PACKAGE_RELEASE ${FILE_REV})
set(CPACK_PACKAGE_VERSION ${PROJECT_VERSION}-${FILE_REV})
set(CPACK_DEBIAN_PACKAGE_DEPENDS "nodejs (>=12.0.0),jq,bash,systemd,logrotate,util-linux,coreutils")

IF(NOT CPACK_DEBIAN_PACKAGE_ARCHITECTURE)
    FIND_PROGRAM(DPKG_CMD dpkg)
    IF(NOT DPKG_CMD)
        MESSAGE(STATUS "Can not find dpkg in your path, default to i386.")
        SET(CPACK_DEBIAN_PACKAGE_ARCHITECTURE i386)
    ENDIF(NOT DPKG_CMD)
    EXECUTE_PROCESS(COMMAND "${DPKG_CMD}" --print-architecture
        OUTPUT_VARIABLE CPACK_DEBIAN_PACKAGE_ARCHITECTURE
        OUTPUT_STRIP_TRAILING_WHITESPACE)
ENDIF(NOT CPACK_DEBIAN_PACKAGE_ARCHITECTURE)

set(CPACK_PACKAGE_FILE_NAME ${CPACK_PACKAGE_NAME}_${CPACK_PACKAGE_VERSION}_${CPACK_DEBIAN_PACKAGE_ARCHITECTURE})

include(CPack)
