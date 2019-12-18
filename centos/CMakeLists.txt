cmake_minimum_required(VERSION 3.0.2)

file(READ "../version.txt" FILE_VER)
file(READ "../revision.txt" FILE_REV)

project(capsrvd VERSION ${FILE_VER})

cmake_minimum_required(VERSION 3.0.2)

# версию сборки тут
# дополнительная версия пакета
set(CUSTOM_BUILD_VERSION ${FILE_REV})

install(FILES ../capsrvd DESTINATION bin)
install(FILES ../capsrvd.conf.json.example DESTINATION /etc/capsrvd)
install(FILES index.js DESTINATION /usr/lib/capsrvd)
install(FILES ../logrotate/capsrvd DESTINATION /usr/share/capsrvd)
install(FILES ../keep DESTINATION /var/log/capsrvd)
install(FILES ../systemd/capsrvd.service DESTINATION /etc/systemd/system)

SET(CPACK_RPM_POST_INSTALL_SCRIPT_FILE "${CMAKE_CURRENT_SOURCE_DIR}/postinst")
SET(CPACK_RPM_PRE_UNINSTALL_SCRIPT_FILE "${CMAKE_CURRENT_SOURCE_DIR}/prerm")
SET(CPACK_RPM_POST_UNINSTALL_SCRIPT_FILE "${CMAKE_CURRENT_SOURCE_DIR}/postrm")

#настройки cpack'a
set(CPACK_PACKAGE_VENDOR "LLC Bridge-Technology")
set(CPACK_PACKAGE_DESCRIPTION_SUMMARY "capsrvd server")
set(CPACK_PACKAGE_CONTACT "ikonopistsev@jsuff.com")
set(CPACK_STRIP_FILES TRUE)

# указываем версию пакета (прописывается в пакете)
# рабоает для RPM
set(CPACK_PACKAGE_VERSION ${PROJECT_VERSION})

#указываем генератор
set(CPACK_GENERATOR "RPM")

# условие для DEB и RPM
set(CUSTOM_SUFFIX ".el7")

#для RPM
    # необходимо выпилить автодиректории
# указывать надо именно полные пути, хз почему
set(CPACK_RPM_EXCLUDE_FROM_AUTO_FILELIST /usr /usr/lib /usr/share /usr/bin /etc /etc/systemd /etc/systemd/system /var /var/log)

#добавить зависимость от субд
set(CPACK_RPM_PACKAGE_REQUIRES "nodejs,jq,bash,systemd,logrotate,util-linux,coreutils")

# говорим чтобы он проверил зависимости
set(CPACK_RPM_PACKAGE_AUTOREQ ON)

# прописываем релиз пакета (внутри RPM)
set(CPACK_RPM_PACKAGE_RELEASE ${CUSTOM_BUILD_VERSION})

# прописываем имя выходного файла
set(CPACK_PACKAGE_FILE_NAME "${CMAKE_PROJECT_NAME}-${CPACK_PACKAGE_VERSION}-${CUSTOM_BUILD_VERSION}${CUSTOM_SUFFIX}.${CMAKE_SYSTEM_PROCESSOR}")

include(CPack)
